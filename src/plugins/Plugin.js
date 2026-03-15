'use strict';

class Plugin {
  
  constructor(metadata = {}) {
    if (!metadata.name) {
      throw new Error('Plugin name is required.');
    }

    this.name = metadata.name;
    this.version = metadata.version || '1.0.0';
    this.description = metadata.description || '';
    this.dependencies = metadata.dependencies || [];

    this.loaded = false;

    this.client = null;
  }

  onLoad(client) {

  }

  onReady(client) {

  }

  onUnload(client) {

  }

  on(event, handler) {
    if (!this.client) return;

    if (!this._handlers) this._handlers = [];
    const wrappedHandler = (...args) => handler.call(this, ...args);
    this._handlers.push({ event, handler: wrappedHandler });
    this.client.on(event, wrappedHandler);
  }

  _removeAllListeners() {
    if (!this._handlers || !this.client) return;
    for (const { event, handler } of this._handlers) {
      this.client.removeListener(event, handler);
    }
    this._handlers = [];
  }
}

module.exports = Plugin;
