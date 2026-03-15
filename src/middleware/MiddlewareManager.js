'use strict';

/**
 * Express.js-style Middleware Pipeline for Discord interactions.
 * Allows chaining middleware functions before command execution.
 * 
 * @example
 * client.use(async (ctx, next) => {
 *   ctx.startTime = Date.now();
 *   await next();
 *   console.log(`Took ${Date.now() - ctx.startTime}ms`);
 * });
 */
class MiddlewareManager {
  constructor(client) {
    this.client = client;

    /** @type {Function[]} Global middleware stack */
    this._global = [];

    /** @type {Map<string, Function[]>} Command-specific middleware */
    this._command = new Map();

    /** @type {Map<string, Function[]>} Group middleware (applied to command groups) */
    this._groups = new Map();
  }

  /**
   * Register a global middleware that runs on every interaction.
   * @param {Function} fn - (ctx, next) => Promise<void>
   * @returns {MiddlewareManager}
   */
  use(fn) {
    if (typeof fn !== 'function') {
      throw new TypeError('Middleware must be a function');
    }
    this._global.push(fn);
    return this;
  }

  /**
   * Register middleware for a specific command.
   * @param {string} commandName 
   * @param  {...Function} fns 
   * @returns {MiddlewareManager}
   */
  forCommand(commandName, ...fns) {
    if (!this._command.has(commandName)) {
      this._command.set(commandName, []);
    }
    const stack = this._command.get(commandName);
    for (const fn of fns) {
      if (typeof fn !== 'function') {
        throw new TypeError('Middleware must be a function');
      }
      stack.push(fn);
    }
    return this;
  }

  /**
   * Register middleware for a command group.
   * @param {string} groupName 
   * @param  {...Function} fns 
   * @returns {MiddlewareManager}
   */
  forGroup(groupName, ...fns) {
    if (!this._groups.has(groupName)) {
      this._groups.set(groupName, []);
    }
    const stack = this._groups.get(groupName);
    for (const fn of fns) {
      if (typeof fn !== 'function') {
        throw new TypeError('Middleware must be a function');
      }
      stack.push(fn);
    }
    return this;
  }

  /**
   * Build the full middleware stack for a given command and execute it.
   * @param {object} ctx - The interaction/context object
   * @param {string} commandName
   * @param {string|null} groupName
   * @param {Function} finalHandler - The actual command execute function
   * @returns {Promise<void>}
   */
  async execute(ctx, commandName, groupName, finalHandler) {
    const stack = [];

    // 1. Global middlewares
    stack.push(...this._global);

    // 2. Group middlewares
    if (groupName && this._groups.has(groupName)) {
      stack.push(...this._groups.get(groupName));
    }

    // 3. Command-specific middlewares
    if (this._command.has(commandName)) {
      stack.push(...this._command.get(commandName));
    }

    // 4. Compose and run
    await this._compose(stack, ctx, finalHandler);
  }

  /**
   * Koa-style compose: chains middleware with next() calls.
   * @private
   */
  async _compose(stack, ctx, finalHandler) {
    let index = -1;

    const dispatch = async (i) => {
      if (i <= index) {
        throw new Error('next() called multiple times');
      }
      index = i;

      let fn;
      if (i < stack.length) {
        fn = stack[i];
      } else if (i === stack.length) {
        fn = finalHandler;
      }

      if (!fn) return;

      await fn(ctx, () => dispatch(i + 1));
    };

    await dispatch(0);
  }

  /**
   * Remove all middlewares.
   */
  clear() {
    this._global = [];
    this._command.clear();
    this._groups.clear();
  }

  /**
   * Get the count of registered middlewares.
   * @returns {{ global: number, command: number, group: number }}
   */
  get stats() {
    let commandCount = 0;
    for (const [, stack] of this._command) commandCount += stack.length;
    let groupCount = 0;
    for (const [, stack] of this._groups) groupCount += stack.length;

    return {
      global: this._global.length,
      command: commandCount,
      group: groupCount,
      total: this._global.length + commandCount + groupCount,
    };
  }
}

module.exports = MiddlewareManager;
