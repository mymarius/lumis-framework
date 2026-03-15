'use strict';

const Logger = require('../utils/Logger');

class SQLiteAdapter {
  
  constructor(options = {}) {
    this.table = options.table || 'lumis_cache';
    this.defaultTTL = options.ttl || 0;
    this.logger = new Logger({ prefix: 'SQLiteCache', level: 'info' });

    try {
      const Database = require('better-sqlite3');
      this.db = new Database(options.path || ':memory:');

      this.db.pragma('journal_mode = WAL');

      this.db.exec(`
        CREATE TABLE IF NOT EXISTS ${this.table} (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL,
          expires_at INTEGER
        )
      `);

      this._stmts = {
        get: this.db.prepare(`SELECT value, expires_at FROM ${this.table} WHERE key = ?`),
        set: this.db.prepare(
          `INSERT OR REPLACE INTO ${this.table} (key, value, expires_at) VALUES (?, ?, ?)`
        ),
        delete: this.db.prepare(`DELETE FROM ${this.table} WHERE key = ?`),
        has: this.db.prepare(`SELECT 1 FROM ${this.table} WHERE key = ?`),
        clear: this.db.prepare(`DELETE FROM ${this.table}`),
        size: this.db.prepare(`SELECT COUNT(*) as count FROM ${this.table}`),
        all: this.db.prepare(`SELECT key, value FROM ${this.table}`),
        keys: this.db.prepare(`SELECT key FROM ${this.table}`),
        cleanup: this.db.prepare(`DELETE FROM ${this.table} WHERE expires_at IS NOT NULL AND expires_at < ?`),
      };

      this.logger.info('SQLite cache started.');
    } catch (error) {
      throw new Error(
        'SQLite adapter requires "better-sqlite3" package. Installation: npm install better-sqlite3'
      );
    }
  }

  async get(key) {
    this._cleanup();
    const row = this._stmts.get.get(key);
    if (!row) return undefined;

    if (row.expires_at && Date.now() > row.expires_at) {
      this._stmts.delete.run(key);
      return undefined;
    }

    try {
      return JSON.parse(row.value);
    } catch {
      return row.value;
    }
  }

  async set(key, value, ttl) {
    const effectiveTTL = ttl ?? this.defaultTTL;
    const expiresAt = effectiveTTL > 0 ? Date.now() + (effectiveTTL * 1000) : null;
    const serialized = JSON.stringify(value);
    this._stmts.set.run(key, serialized, expiresAt);
  }

  async delete(key) {
    const result = this._stmts.delete.run(key);
    return result.changes > 0;
  }

  async has(key) {
    const value = await this.get(key);
    return value !== undefined;
  }

  async clear() {
    this._stmts.clear.run();
  }

  async size() {
    this._cleanup();
    const row = this._stmts.size.get();
    return row.count;
  }

  async values() {
    this._cleanup();
    const rows = this._stmts.all.all();
    return rows.map((row) => {
      try { return JSON.parse(row.value); } catch { return row.value; }
    });
  }

  async keys() {
    this._cleanup();
    return this._stmts.keys.all().map((row) => row.key);
  }

  async filter(fn) {
    this._cleanup();
    const rows = this._stmts.all.all();
    const results = [];
    for (const row of rows) {
      let value;
      try { value = JSON.parse(row.value); } catch { value = row.value; }
      if (fn(value, row.key)) {
        results.push(value);
      }
    }
    return results;
  }

  _cleanup() {
    this._stmts.cleanup.run(Date.now());
  }

  async destroy() {
    if (this.db) {
      this.db.close();
      this.logger.info('SQLite cache closed.');
    }
  }
}

module.exports = SQLiteAdapter;
