'use strict';

class MemoryAdapter {
  constructor(options = {}) {
    
    this._store = new Map();

    this.maxSize = options.maxSize || 0;

    this.defaultTTL = options.ttl || 0;

    this._accessOrder = [];
  }

  async get(key) {
    const entry = this._store.get(key);
    if (!entry) return undefined;

    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      this._store.delete(key);
      this._removeFromAccessOrder(key);
      return undefined;
    }

    this._touchAccessOrder(key);

    return entry.value;
  }

  async set(key, value, ttl) {

    if (this.maxSize > 0 && !this._store.has(key) && this._store.size >= this.maxSize) {
      this._evict();
    }

    const effectiveTTL = ttl ?? this.defaultTTL;
    const expiresAt = effectiveTTL > 0 ? Date.now() + (effectiveTTL * 1000) : null;

    this._store.set(key, { value, expiresAt });
    this._touchAccessOrder(key);
  }

  async delete(key) {
    this._removeFromAccessOrder(key);
    return this._store.delete(key);
  }

  async has(key) {
    const value = await this.get(key); // TTL kontrolü yapar
    return value !== undefined;
  }

  async clear() {
    this._store.clear();
    this._accessOrder = [];
  }

  async size() {

    await this._cleanup();
    return this._store.size;
  }

  async values() {
    await this._cleanup();
    return [...this._store.values()].map((entry) => entry.value);
  }

  async keys() {
    await this._cleanup();
    return [...this._store.keys()];
  }

  async filter(fn) {
    await this._cleanup();
    const results = [];
    for (const [key, entry] of this._store) {
      if (fn(entry.value, key)) {
        results.push(entry.value);
      }
    }
    return results;
  }

  async forEach(fn) {
    await this._cleanup();
    for (const [key, entry] of this._store) {
      fn(entry.value, key);
    }
  }

  _evict() {
    if (this._accessOrder.length > 0) {
      const oldestKey = this._accessOrder.shift();
      this._store.delete(oldestKey);
    }
  }

  _touchAccessOrder(key) {
    this._removeFromAccessOrder(key);
    this._accessOrder.push(key);
  }

  _removeFromAccessOrder(key) {
    const index = this._accessOrder.indexOf(key);
    if (index !== -1) {
      this._accessOrder.splice(index, 1);
    }
  }

  async _cleanup() {
    const now = Date.now();
    for (const [key, entry] of this._store) {
      if (entry.expiresAt && now > entry.expiresAt) {
        this._store.delete(key);
        this._removeFromAccessOrder(key);
      }
    }
  }
}

module.exports = MemoryAdapter;
