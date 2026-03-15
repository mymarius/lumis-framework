'use strict';

/**
 * Dependency Injection Container.
 * Register services and inject them into commands/plugins automatically.
 * 
 * @example
 * client.services.register('db', new DatabaseService());
 * client.services.register('api', new ExternalAPI());
 * 
 * // In a command:
 * class MyCmd extends Command {
 *   inject = ['db', 'api'];
 *   async execute(interaction) {
 *     await this.db.query(...);
 *   }
 * }
 */
class ServiceContainer {
  constructor(client) {
    this.client = client;

    /** @type {Map<string, { instance: any, singleton: boolean, factory: Function|null }>} */
    this._services = new Map();

    /** @type {Map<string, Function[]>} Event hooks */
    this._hooks = new Map();
  }

  /**
   * Register a service.
   * @param {string} name - Service identifier
   * @param {any} instanceOrFactory - The service instance or factory function
   * @param {object} [options]
   * @param {boolean} [options.singleton=true] - If false, factory creates new instance each time
   * @returns {ServiceContainer}
   */
  register(name, instanceOrFactory, options = {}) {
    if (typeof name !== 'string' || !name) {
      throw new TypeError('Service name must be a non-empty string');
    }

    const singleton = options.singleton !== false;
    const isFactory = typeof instanceOrFactory === 'function' && !instanceOrFactory.prototype?.constructor;

    this._services.set(name, {
      instance: isFactory ? (singleton ? null : undefined) : instanceOrFactory,
      singleton,
      factory: isFactory ? instanceOrFactory : null,
      initialized: !isFactory,
    });

    this.client.logger?.debug(`Service registered: ${name}`);
    this._runHooks('register', name);

    return this;
  }

  /**
   * Get a service by name.
   * @param {string} name 
   * @returns {any}
   */
  get(name) {
    const entry = this._services.get(name);
    if (!entry) {
      throw new Error(`Service "${name}" is not registered.`);
    }

    // Singleton with factory, lazy init
    if (entry.factory && entry.singleton && !entry.initialized) {
      entry.instance = entry.factory(this.client);
      entry.initialized = true;
      return entry.instance;
    }

    // Transient factory, create new every time
    if (entry.factory && !entry.singleton) {
      return entry.factory(this.client);
    }

    return entry.instance;
  }

  /**
   * Check if a service exists.
   * @param {string} name 
   * @returns {boolean}
   */
  has(name) {
    return this._services.has(name);
  }

  /**
   * Remove a service.
   * @param {string} name 
   * @returns {boolean}
   */
  unregister(name) {
    const entry = this._services.get(name);
    if (!entry) return false;

    // Call destroy if available
    if (entry.instance && typeof entry.instance.destroy === 'function') {
      try { entry.instance.destroy(); } catch {}
    }

    this._services.delete(name);
    this._runHooks('unregister', name);
    return true;
  }

  /**
   * Inject services into a target object based on its `inject` property.
   * @param {object} target - Object with `inject` array
   * @returns {object} The target with injected services
   */
  inject(target) {
    if (!target || !target.inject || !Array.isArray(target.inject)) return target;

    for (const name of target.inject) {
      if (this.has(name)) {
        Object.defineProperty(target, name, {
          get: () => this.get(name),
          configurable: true,
        });
      } else {
        this.client.logger?.warn(`Cannot inject service "${name}": not registered.`);
      }
    }

    return target;
  }

  /**
   * Register a hook.
   * @param {'register'|'unregister'} event 
   * @param {Function} fn 
   */
  on(event, fn) {
    if (!this._hooks.has(event)) this._hooks.set(event, []);
    this._hooks.get(event).push(fn);
  }

  /** @private */
  _runHooks(event, name) {
    const hooks = this._hooks.get(event);
    if (!hooks) return;
    for (const fn of hooks) {
      try { fn(name); } catch {}
    }
  }

  /**
   * List all registered services.
   * @returns {Array<{ name: string, singleton: boolean, initialized: boolean }>}
   */
  list() {
    return [...this._services.entries()].map(([name, entry]) => ({
      name,
      singleton: entry.singleton,
      initialized: entry.initialized,
    }));
  }

  /**
   * Destroy all services and clear the container.
   */
  async destroy() {
    for (const [name, entry] of this._services) {
      if (entry.instance && typeof entry.instance.destroy === 'function') {
        try { await entry.instance.destroy(); } catch {}
      }
    }
    this._services.clear();
    this._hooks.clear();
  }
}

module.exports = ServiceContainer;
