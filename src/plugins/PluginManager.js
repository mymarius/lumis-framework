'use strict';

const Logger = require('../utils/Logger');
const { LumisError } = require('../errors/LumisError');
const { ErrorCodes } = require('../errors/ErrorCodes');

class PluginManager {
  
  constructor(client) {
    this.client = client;

    this.plugins = new Map();

    this.logger = new Logger({ prefix: 'PluginManager', level: 'info' });
  }

  load(plugin) {

    if (!plugin || !plugin.name) {
      throw new LumisError(ErrorCodes.PLUGIN_INVALID, 'unknown');
    }

    if (this.plugins.has(plugin.name)) {
      throw new LumisError(ErrorCodes.PLUGIN_ALREADY_LOADED, plugin.name);
    }

    if (plugin.dependencies && plugin.dependencies.length > 0) {
      for (const dep of plugin.dependencies) {
        if (!this.plugins.has(dep)) {
          throw new LumisError(ErrorCodes.PLUGIN_DEPENDENCY_MISSING, plugin.name, dep);
        }
      }
    }

    try {
      plugin.client = this.client;
      plugin.onLoad(this.client);
      plugin.loaded = true;
      this.plugins.set(plugin.name, plugin);

      this.logger.info(`Plugin loaded: ${plugin.name} v${plugin.version}`);
    } catch (error) {
      throw new LumisError(ErrorCodes.PLUGIN_LOAD_ERROR, plugin.name, error.message);
    }

    return this;
  }

  loadAll(...plugins) {
    for (const plugin of plugins.flat()) {
      this.load(plugin);
    }
    return this;
  }

  unload(name) {
    const plugin = this.plugins.get(name);
    if (!plugin) {
      throw new LumisError(ErrorCodes.PLUGIN_NOT_FOUND, name);
    }

    for (const [, other] of this.plugins) {
      if (other.dependencies && other.dependencies.includes(name)) {
        this.logger.warn(
          `Plugin '${name}' cannot be unloaded: '${other.name}' depends on it.`
        );
        return false;
      }
    }

    try {
      plugin._removeAllListeners();
      plugin.onUnload(this.client);
      plugin.loaded = false;
      plugin.client = null;
      this.plugins.delete(name);

      this.logger.info(`Plugin unloaded: ${name}`);
      return true;
    } catch (error) {
      this.logger.error(`Plugin unload error '${name}':`, error.message);
      return false;
    }
  }

  get(name) {
    return this.plugins.get(name);
  }

  has(name) {
    return this.plugins.has(name);
  }

  _notifyReady() {
    for (const [, plugin] of this.plugins) {
      try {
        plugin.onReady(this.client);
      } catch (error) {
        this.logger.error(`Plugin onReady error '${plugin.name}':`, error.message);
      }
    }
  }

  unloadAll() {

    const names = [...this.plugins.keys()].reverse();
    for (const name of names) {
      try {
        this.unload(name);
      } catch {}
    }
  }

  list() {
    return [...this.plugins.values()].map((p) => ({
      name: p.name,
      version: p.version,
      description: p.description,
      loaded: p.loaded,
    }));
  }
}

module.exports = PluginManager;
