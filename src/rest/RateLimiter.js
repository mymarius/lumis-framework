'use strict';

const { setTimeout: sleep } = require('node:timers/promises');
const Logger = require('../utils/Logger');

class RateLimiter {
  
  constructor(options = {}) {
    this.maxRetries = options.maxRetries || 3;
    this.globalRequestsPerSecond = options.globalRequestsPerSecond || 50;

    this.routeToBucket = new Map();

    this.buckets = new Map();

    this.global = {
      blocked: false,
      resetAt: 0,
    };

    this.queues = new Map();

    this.processing = new Map();

    this.logger = new Logger({ prefix: 'RateLimiter', level: options.logLevel || 'warn' });
  }

  getRouteKey(method, route) {

    const majorParams = route.replace(/\/([a-z-]+)\/(\d{16,20})/g, (match, resource, id) => {
      if (['channels', 'guilds', 'webhooks'].includes(resource)) {
        return `/${resource}/${id}`;
      }
      return `/${resource}/:id`;
    });
    return `${method}:${majorParams}`;
  }

  async enqueue(method, route, request) {
    const routeKey = this.getRouteKey(method, route);

    return new Promise((resolve, reject) => {
      if (!this.queues.has(routeKey)) {
        this.queues.set(routeKey, []);
      }

      this.queues.get(routeKey).push({ request, resolve, reject, retries: 0 });
      this._processQueue(routeKey);
    });
  }

  async _processQueue(routeKey) {
    if (this.processing.get(routeKey)) return;
    this.processing.set(routeKey, true);

    const queue = this.queues.get(routeKey);

    while (queue && queue.length > 0) {
      const item = queue[0];

      try {

        await this._waitForGlobal();

        await this._waitForBucket(routeKey);

        const response = await item.request();

        this._updateBucket(routeKey, response);

        if (response.status === 429) {
          const body = await response.json();
          const retryAfter = (body.retry_after || 1) * 1000;
          const isGlobal = body.global || false;

          this.logger.warn(
            `Rate limited on ${routeKey}. Retry after: ${retryAfter}ms. Global: ${isGlobal}`
          );

          if (isGlobal) {
            this.global.blocked = true;
            this.global.resetAt = Date.now() + retryAfter;
          }

          item.retries++;
          if (item.retries >= this.maxRetries) {
            queue.shift();
            item.reject(new Error(`Rate limit exceeded after ${this.maxRetries} retries`));
          } else {
            await sleep(retryAfter);
          }
          continue;
        }

        queue.shift();
        item.resolve(response);
      } catch (error) {
        queue.shift();
        item.reject(error);
      }
    }

    this.processing.set(routeKey, false);
  }

  async _waitForGlobal() {
    if (this.global.blocked) {
      const waitTime = this.global.resetAt - Date.now();
      if (waitTime > 0) {
        this.logger.debug(`Global rate limit: ${waitTime}ms bekleniyor...`);
        await sleep(waitTime);
      }
      this.global.blocked = false;
    }
  }

  async _waitForBucket(routeKey) {
    const bucketId = this.routeToBucket.get(routeKey);
    if (!bucketId) return;

    const bucket = this.buckets.get(bucketId);
    if (!bucket) return;

    if (bucket.remaining <= 0) {
      const waitTime = bucket.resetAt - Date.now();
      if (waitTime > 0) {
        this.logger.debug(`Bucket ${bucketId}: ${waitTime}ms bekleniyor (remaining: 0)...`);
        await sleep(waitTime);

        bucket.remaining = bucket.limit;
      }
    }
  }

  _updateBucket(routeKey, response) {
    const headers = response.headers;

    const bucketId = headers.get('x-ratelimit-bucket');
    if (!bucketId) return;

    this.routeToBucket.set(routeKey, bucketId);

    const remaining = parseInt(headers.get('x-ratelimit-remaining'), 10);
    const limit = parseInt(headers.get('x-ratelimit-limit'), 10);
    const resetAfter = parseFloat(headers.get('x-ratelimit-reset-after')) * 1000;

    this.buckets.set(bucketId, {
      remaining: isNaN(remaining) ? 1 : remaining,
      limit: isNaN(limit) ? Infinity : limit,
      resetAt: Date.now() + (isNaN(resetAfter) ? 0 : resetAfter),
    });

    if (headers.get('x-ratelimit-global')) {
      this.global.blocked = true;
      this.global.resetAt = Date.now() + (resetAfter || 1000);
    }
  }

  clear() {
    this.routeToBucket.clear();
    this.buckets.clear();
    this.global.blocked = false;
    this.global.resetAt = 0;
    this.queues.clear();
    this.processing.clear();
  }
}

module.exports = RateLimiter;
