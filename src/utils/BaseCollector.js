'use strict';

const { EventEmitter } = require('node:events');
const Collection = require('./Collection');

class BaseCollector extends EventEmitter {
  constructor(client, filter, options = {}) {
    super();

    this.client = client;
    this.filter = filter;
    this.options = options;

    this.collected = new Collection();

    this.ended = false;

    this.max = options.max || null;
    this._timeout = null;

    if (options.time) {
      this._timeout = setTimeout(() => this.stop('time'), options.time).unref();
    }
  }

  async handleCollect(...args) {
    if (this.ended) return;

    const item = args[0]; // Usually the first argument is the collected object itself (message, interaction, etc.)
    const id = this.collectId(item);

    let passesFilter = false;
    try {
      passesFilter = await this.filter(...args);
    } catch (err) {
      this.client.logger.error('Collector filter error:', err);
    }

    if (passesFilter) {
      this.collected.set(id, item);
      this.emit('collect', item);

      if (this.max && this.collected.size >= this.max) {
        this.stop('limit');
      }
    }
  }

  collectId(item) {
    return item.id;
  }

  stop(reason = 'user') {
    if (this.ended) return;
    this.ended = true;

    if (this._timeout) {
      clearTimeout(this._timeout);
      this._timeout = null;
    }

    this.emit('end', this.collected, reason);
    this.removeAllListeners();
  }
}

module.exports = BaseCollector;
