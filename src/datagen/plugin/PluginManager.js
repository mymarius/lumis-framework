'use strict';

const fs = require('fs');
const path = require('path');

class PluginManager {
  constructor({ pluginDir, rootDir, locale }) {
    this.rootDir = rootDir;
    this.locale = locale;
    this.plugins = [];

    if (pluginDir) {
      this.loadFromDirectory(pluginDir);
    }
  }

  loadFromDirectory(dir) {
    const resolved = path.isAbsolute(dir) ? dir : path.join(this.rootDir, dir);
    if (!fs.existsSync(resolved)) return;
    const files = fs.readdirSync(resolved);
    for (const file of files) {
      if (!file.toLowerCase().endsWith('.js')) continue;
      try {
        const plugin = require(path.join(resolved, file));
        if (plugin && typeof plugin.init === 'function') {
          plugin.init({ locale: this.locale, register: this.register.bind(this) });
        }
      } catch (err) {
        // ignore
      }
    }
  }

  register(plugin) {
    this.plugins.push(plugin);
  }

  getGenerator(name) {
    return this.plugins.find((p) => p.name === name);
  }
}

module.exports = { PluginManager };
