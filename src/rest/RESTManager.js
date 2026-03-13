'use strict';

const { fetch } = require('undici');
const { API_BASE_URL } = require('../utils/Constants');
const RateLimiter = require('./RateLimiter');
const { APIError } = require('../errors/LumisError');
const Logger = require('../utils/Logger');

class RESTManager {
  
  constructor(client, options = {}) {
    this.client = client;
    this.baseURL = options.baseURL || API_BASE_URL;
    this.rateLimiter = new RateLimiter({
      maxRetries: options.maxRetries || 3,
      logLevel: options.logLevel || 'warn',
    });
    this.logger = new Logger({ prefix: 'REST', level: options.logLevel || 'info' });

    this.timeout = options.timeout || 15000;

    this.userAgent = `DiscordBot (lumis, 1.0.0)`;
  }

  setToken(token) {
    this.token = token;
  }

  async request(method, endpoint, options = {}) {
    const url = this._buildURL(endpoint, options.query);
    const headers = this._buildHeaders(options);
    const body = options.body ? JSON.stringify(options.body) : undefined;

    this.logger.debug(`${method} ${endpoint}`);

    const response = await this.rateLimiter.enqueue(method, endpoint, () =>
      fetch(url, {
        method,
        headers,
        body,
        signal: AbortSignal.timeout(this.timeout),
      })
    );

    return this._handleResponse(response, method, endpoint);
  }

  get(endpoint, options = {}) {
    return this.request('GET', endpoint, options);
  }

  post(endpoint, options = {}) {
    return this.request('POST', endpoint, options);
  }

  patch(endpoint, options = {}) {
    return this.request('PATCH', endpoint, options);
  }

  put(endpoint, options = {}) {
    return this.request('PUT', endpoint, options);
  }

  delete(endpoint, options = {}) {
    return this.request('DELETE', endpoint, options);
  }

  _buildURL(endpoint, query) {
    let url = `${this.baseURL}${endpoint}`;
    if (query && Object.keys(query).length > 0) {
      const params = new URLSearchParams();
      for (const [key, value] of Object.entries(query)) {
        if (value !== undefined && value !== null) {
          params.append(key, value);
        }
      }
      url += `?${params.toString()}`;
    }
    return url;
  }

  _buildHeaders(options) {
    const headers = {
      'User-Agent': this.userAgent,
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.token) {
      headers['Authorization'] = `Bot ${this.token}`;
    }

    if (options.reason) {
      headers['X-Audit-Log-Reason'] = encodeURIComponent(options.reason);
    }

    return headers;
  }

  async _handleResponse(response, method, endpoint) {

    if (response.status === 204) return null;

    let body;
    try {
      body = await response.json();
    } catch {
      body = null;
    }

    if (response.ok) return body;

    throw new APIError(endpoint, body || { message: response.statusText }, method, response.status);
  }

  destroy() {
    this.rateLimiter.clear();
    this.token = null;
  }
}

module.exports = RESTManager;
