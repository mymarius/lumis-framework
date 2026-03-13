'use strict';

const Logger = require('../utils/Logger');

class RedisAdapter {
  
  constructor(options = {}) {
    this.prefix = options.prefix || 'lumis:';
    this.defaultTTL = options.ttl || 0;
    this.logger = new Logger({ prefix: 'RedisCache', level: 'info' });

    try {
      const Redis = require('ioredis');
      this.client = new Redis(options.redis || {});
      this.logger.info('Redis connection established.');
    } catch (error) {
      throw new Error(
        'Redis adapter requires "ioredis" package. Installation: npm install ioredis'
      );
    }
  }

  _key(key) {
    return `${this.prefix}${key}`;
  }

  async get(key) {
    const data = await this.client.get(this._key(key));
    if (data === null) return undefined;
    try {
      return JSON.parse(data);
    } catch {
      return data;
    }
  }

  async set(key, value, ttl) {
    const effectiveTTL = ttl ?? this.defaultTTL;
    const serialized = JSON.stringify(value);

    if (effectiveTTL > 0) {
      await this.client.setex(this._key(key), effectiveTTL, serialized);
    } else {
      await this.client.set(this._key(key), serialized);
    }
  }

  async delete(key) {
    const result = await this.client.del(this._key(key));
    return result > 0;
  }

  async has(key) {
    const exists = await this.client.exists(this._key(key));
    return exists === 1;
  }

  async clear() {
    const keys = await this.client.keys(`${this.prefix}*`);
    if (keys.length > 0) {
      await this.client.del(...keys);
    }
  }

  async size() {
    const keys = await this.client.keys(`${this.prefix}*`);
    return keys.length;
  }

  async values() {
    const keys = await this.client.keys(`${this.prefix}*`);
    if (keys.length === 0) return [];
    const values = await this.client.mget(...keys);
    return values.map((v) => {
      try { return JSON.parse(v); } catch { return v; }
    }).filter((v) => v !== null);
  }

  async keys() {
    const keys = await this.client.keys(`${this.prefix}*`);
    return keys.map((k) => k.slice(this.prefix.length));
  }

  async filter(fn) {
    const allKeys = await this.keys();
    const results = [];
    for (const key of allKeys) {
      const value = await this.get(key);
      if (value !== undefined && fn(value, key)) {
        results.push(value);
      }
    }
    return results;
  }

  async destroy() {
    if (this.client) {
      await this.client.quit();
      this.logger.info('Redis connection closed.');
    }
  }
}

module.exports = RedisAdapter;
