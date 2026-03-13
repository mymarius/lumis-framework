'use strict';

const MemoryAdapter = require('./MemoryAdapter');
const Logger = require('../utils/Logger');
const { LumisError } = require('../errors/LumisError');
const { ErrorCodes } = require('../errors/ErrorCodes');

class CacheManager {
  
  constructor(options = {}) {
    this.options = options;
    this.logger = new Logger({ prefix: 'Cache', level: 'info' });

    const adapterName = options.adapter || 'memory';
    this.adapter = this._createAdapter(adapterName, options);
    this.logger.info(`Cache adaptörü: ${adapterName}`);
  }

  _createAdapter(name, options) {
    switch (name) {
      case 'memory':
        return new MemoryAdapter(options);

      case 'redis': {
        const RedisAdapter = require('./RedisAdapter');
        return new RedisAdapter(options);
      }

      case 'sqlite': {
        const SQLiteAdapter = require('./SQLiteAdapter');
        return new SQLiteAdapter(options);
      }

      default:

        if (typeof name === 'object' && name.get && name.set) {
          return name;
        }
        throw new LumisError(ErrorCodes.CACHE_ADAPTER_NOT_FOUND, name);
    }
  }

  get(key) {
    return this.adapter.get(key);
  }

  set(key, value, ttl) {
    return this.adapter.set(key, value, ttl);
  }

  delete(key) {
    return this.adapter.delete(key);
  }

  has(key) {
    return this.adapter.has(key);
  }

  clear() {
    return this.adapter.clear();
  }

  size() {
    return this.adapter.size();
  }

  values() {
    return this.adapter.values();
  }

  keys() {
    return this.adapter.keys();
  }

  filter(fn) {
    return this.adapter.filter(fn);
  }

  async ensure(key, defaultValue, ttl) {
    const existing = await this.get(key);
    if (existing !== undefined) return existing;

    const value = typeof defaultValue === 'function' ? await defaultValue() : defaultValue;
    await this.set(key, value, ttl);
    return value;
  }

  async destroy() {
    if (this.adapter.destroy) {
      await this.adapter.destroy();
    }
  }
}

module.exports = CacheManager;
