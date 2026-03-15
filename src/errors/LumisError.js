'use strict';

const { ErrorCodes, ErrorMessages } = require('./ErrorCodes');

class LumisError extends Error {
  
  constructor(code, ...args) {
    const message = LumisError._getMessage(code, args);
    super(message);

    this.name = 'LumisError';
    this.code = code;

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  static _getMessage(code, args) {
    const msg = ErrorMessages[code];
    if (!msg) return `Unknown error: ${code}`;
    if (typeof msg === 'function') return msg(...args);
    return msg;
  }
}

class APIError extends LumisError {
  
  constructor(path, error, method, status) {
    super(ErrorCodes.API_ERROR, status, error.message || 'Unknown');

    this.name = 'APIError';
    this.method = method;
    this.path = path;
    this.httpStatus = status;
    this.requestBody = null;

    this.discordCode = error.code || 0;

    this.discordMessage = error.message || 'Unknown';

    this.errors = error.errors || {};
  }

  toJSON() {
    return {
      name: this.name,
      code: this.code,
      discordCode: this.discordCode,
      message: this.discordMessage,
      method: this.method,
      path: this.path,
      httpStatus: this.httpStatus,
      errors: this.errors,
    };
  }
}

class WebSocketError extends LumisError {
  
  constructor(code, closeCode, ...args) {
    super(code, ...args);
    this.name = 'WebSocketError';
    this.closeCode = closeCode || null;
  }
}

class RateLimitError extends LumisError {
  
  constructor(path, retryAfter, global = false) {
    super(ErrorCodes.RATE_LIMITED, retryAfter);

    this.name = 'RateLimitError';
    this.path = path;
    this.retryAfter = retryAfter;
    this.global = global;
  }
}

module.exports = {
  LumisError,
  APIError,
  WebSocketError,
  RateLimitError,
};
