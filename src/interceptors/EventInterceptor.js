'use strict';

/**
 * Event Interceptors & Transformers.
 * Intercept, modify, or block events before they reach listeners.
 * 
 * @example
 * client.interceptors.add('messageCreate', (message) => {
 *   message.isSpam = message.content.length > 2000;
 *   return message; // Transformed
 * });
 * 
 * client.interceptors.add('messageCreate', (message) => {
 *   if (message.author.bot) return null; // Block event
 *   return message;
 * });
 */
class EventInterceptor {
  constructor(client) {
    this.client = client;

    /** @type {Map<string, Array<{ fn: Function, priority: number, name: string }>>} */
    this._interceptors = new Map();

    this._patchEmit();
  }

  /**
   * Add an interceptor for a specific event.
   * @param {string} eventName 
   * @param {Function} fn - (data) => data | null (return null to block)
   * @param {object} [options]
   * @param {number} [options.priority=10] - Lower runs first
   * @param {string} [options.name] - Optional name for debugging
   * @returns {EventInterceptor}
   */
  add(eventName, fn, options = {}) {
    if (typeof fn !== 'function') {
      throw new TypeError('Interceptor must be a function');
    }

    if (!this._interceptors.has(eventName)) {
      this._interceptors.set(eventName, []);
    }

    const entry = {
      fn,
      priority: options.priority ?? 10,
      name: options.name || `interceptor_${eventName}_${Date.now()}`,
    };

    const arr = this._interceptors.get(eventName);
    arr.push(entry);
    arr.sort((a, b) => a.priority - b.priority);

    return this;
  }

  /**
   * Remove an interceptor by name.
   * @param {string} eventName
   * @param {string} name
   * @returns {boolean}
   */
  remove(eventName, name) {
    const arr = this._interceptors.get(eventName);
    if (!arr) return false;

    const idx = arr.findIndex(i => i.name === name);
    if (idx === -1) return false;

    arr.splice(idx, 1);
    return true;
  }

  /**
   * Remove all interceptors for an event.
   * @param {string} [eventName] - If omitted, clears all
   */
  clear(eventName) {
    if (eventName) {
      this._interceptors.delete(eventName);
    } else {
      this._interceptors.clear();
    }
  }

  /**
   * Get the list of interceptors for an event.
   * @param {string} eventName
   * @returns {Array}
   */
  list(eventName) {
    if (eventName) {
      return (this._interceptors.get(eventName) || []).map(i => ({
        name: i.name,
        priority: i.priority,
      }));
    }

    const result = {};
    for (const [name, arr] of this._interceptors) {
      result[name] = arr.map(i => ({ name: i.name, priority: i.priority }));
    }
    return result;
  }

  /**
   * Run interceptors for an event.
   * @param {string} eventName 
   * @param {Array} args 
   * @returns {{ blocked: boolean, args: Array }}
   */
  async process(eventName, args) {
    const arr = this._interceptors.get(eventName);
    if (!arr || arr.length === 0) return { blocked: false, args };

    let currentArgs = [...args];

    for (const interceptor of arr) {
      try {
        const result = await interceptor.fn(...currentArgs);

        // null = block the event
        if (result === null) {
          return { blocked: true, args: currentArgs, blockedBy: interceptor.name };
        }

        // If result returned, replace the first argument
        if (result !== undefined) {
          currentArgs[0] = result;
        }
      } catch (error) {
        this.client.logger?.error(`Interceptor "${interceptor.name}" error:`, error.message);
      }
    }

    return { blocked: false, args: currentArgs };
  }

  /**
   * Monkey-patch the client's emit to run interceptors.
   * @private
   */
  _patchEmit() {
    const originalEmit = this.client.emit.bind(this.client);
    const self = this;

    this.client.emit = function (eventName, ...args) {
      // Skip internal events
      if (eventName === 'newListener' || eventName === 'removeListener') {
        return originalEmit(eventName, ...args);
      }

      const arr = self._interceptors.get(eventName);
      if (!arr || arr.length === 0) {
        return originalEmit(eventName, ...args);
      }

      // Run interceptors asynchronously
      self.process(eventName, args).then(({ blocked, args: newArgs }) => {
        if (!blocked) {
          originalEmit(eventName, ...newArgs);
        }
      }).catch(err => {
        self.client.logger?.error(`Interceptor pipeline error for "${eventName}":`, err.message);
        originalEmit(eventName, ...args);
      });

      return true;
    };
  }
}

module.exports = EventInterceptor;
