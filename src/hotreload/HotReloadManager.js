'use strict';

const fs = require('fs');
const path = require('path');

/**
 * Hot-Reload Command System.
 * Watch command files and reload them without restarting the bot.
 * 
 * @example
 * client.hotReload.watch('./commands');
 * // OR via client options:
 * new Client({ commands: { directory: './commands', hotReload: true } });
 * // Manual:
 * client.hotReload.reload('ping');
 * client.hotReload.reloadAll();
 */
class HotReloadManager {
  constructor(client, commandManager) {
    this.client = client;
    this.commandManager = commandManager;

    /** @type {Map<string, string>} commandName → filePath */
    this._filePaths = new Map();

    /** @type {Map<string, fs.FSWatcher>} directory → watcher */
    this._watchers = new Map();

    /** @type {Map<string, NodeJS.Timeout>} Debounce timers */
    this._debounce = new Map();

    this._reloadCount = 0;
    this._lastReload = null;
  }

  /**
   * Watch a directory for file changes and auto-reload commands.
   * @param {string} dirPath 
   * @param {object} [options]
   * @param {number} [options.debounce=300] - Debounce ms
   * @param {boolean} [options.recursive=true]
   */
  watch(dirPath, options = {}) {
    const absolutePath = path.resolve(dirPath);
    const debounceMs = options.debounce ?? 300;

    if (!fs.existsSync(absolutePath)) {
      this.client.logger?.warn(`HotReload: Directory "${absolutePath}" does not exist.`);
      return this;
    }

    if (this._watchers.has(absolutePath)) {
      this.client.logger?.warn(`HotReload: Already watching "${absolutePath}".`);
      return this;
    }

    // Scan existing commands to build file → name mapping
    this._scanDirectory(absolutePath);

    // Create watcher
    try {
      const watcher = fs.watch(absolutePath, { recursive: options.recursive !== false }, (eventType, filename) => {
        if (!filename || !filename.endsWith('.js')) return;

        const fullPath = path.join(absolutePath, filename);

        // Debounce rapid changes
        const existing = this._debounce.get(fullPath);
        if (existing) clearTimeout(existing);

        this._debounce.set(fullPath, setTimeout(() => {
          this._debounce.delete(fullPath);
          this._onFileChange(fullPath, eventType);
        }, debounceMs));
      });

      this._watchers.set(absolutePath, watcher);
      this.client.logger?.info(`🔥 HotReload: Watching "${absolutePath}" for changes.`);
    } catch (error) {
      this.client.logger?.error(`HotReload: Failed to watch "${absolutePath}":`, error.message);
    }

    return this;
  }

  /**
   * Stop watching a directory.
   * @param {string} dirPath 
   */
  unwatch(dirPath) {
    const absolutePath = path.resolve(dirPath);
    const watcher = this._watchers.get(absolutePath);
    if (watcher) {
      watcher.close();
      this._watchers.delete(absolutePath);
      this.client.logger?.info(`HotReload: Stopped watching "${absolutePath}".`);
    }
  }

  /**
   * Manually reload a specific command by name.
   * @param {string} commandName 
   * @returns {boolean}
   */
  reload(commandName) {
    const filePath = this._filePaths.get(commandName);
    if (!filePath) {
      this.client.logger?.warn(`HotReload: Cannot find file for command "${commandName}".`);
      return false;
    }

    return this._reloadFile(filePath);
  }

  /**
   * Reload all commands from watched directories.
   * @returns {number} Number of reloaded commands
   */
  reloadAll() {
    let count = 0;
    const processed = new Set();

    for (const [, filePath] of this._filePaths) {
      if (processed.has(filePath)) continue;
      processed.add(filePath);
      if (this._reloadFile(filePath)) count++;
    }

    this.client.logger?.info(`🔥 HotReload: Reloaded ${count} commands.`);
    return count;
  }

  /**
   * @private
   */
  _onFileChange(filePath, eventType) {
    if (!fs.existsSync(filePath)) {
      // File deleted — find and unregister command
      for (const [name, fp] of this._filePaths) {
        if (fp === filePath) {
          this.commandManager.commands.delete(name);
          this._filePaths.delete(name);
          this.client.logger?.info(`🔥 HotReload: Command "${name}" removed (file deleted).`);
          break;
        }
      }
      return;
    }

    this._reloadFile(filePath);
  }

  /**
   * @private
   */
  _reloadFile(filePath) {
    try {
      // Clear require cache
      delete require.cache[require.resolve(filePath)];

      const CommandClass = require(filePath);
      const command = new CommandClass();

      if (!command.name) {
        this.client.logger?.warn(`HotReload: File "${filePath}" exports invalid command.`);
        return false;
      }

      // Remove old if exists
      const oldName = this._findCommandByFile(filePath);
      if (oldName && oldName !== command.name) {
        this.commandManager.commands.delete(oldName);
        this._filePaths.delete(oldName);
      }

      // Inject services if DI container exists
      if (this.client.services && typeof this.client.services.inject === 'function') {
        this.client.services.inject(command);
      }

      this.commandManager.commands.set(command.name, command);
      this._filePaths.set(command.name, filePath);

      this._reloadCount++;
      this._lastReload = new Date();

      this.client.logger?.info(`🔥 HotReload: Reloaded command "${command.name}".`);
      this.client.emit?.('commandReload', command.name, filePath);

      return true;
    } catch (error) {
      this.client.logger?.error(`HotReload: Failed to reload "${filePath}":`, error.message);
      return false;
    }
  }

  /** @private */
  _findCommandByFile(filePath) {
    for (const [name, fp] of this._filePaths) {
      if (fp === filePath) return name;
    }
    return null;
  }

  /** @private */
  _scanDirectory(dirPath) {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      if (entry.isDirectory()) {
        this._scanDirectory(fullPath);
      } else if (entry.name.endsWith('.js')) {
        try {
          const CommandClass = require(fullPath);
          const command = new CommandClass();
          if (command.name) {
            this._filePaths.set(command.name, fullPath);
          }
        } catch {}
      }
    }
  }

  /**
   * Get hot-reload statistics.
   * @returns {object}
   */
  get stats() {
    return {
      watching: this._watchers.size,
      trackedCommands: this._filePaths.size,
      totalReloads: this._reloadCount,
      lastReload: this._lastReload,
    };
  }

  /**
   * Destroy all watchers.
   */
  destroy() {
    for (const [dir, watcher] of this._watchers) {
      watcher.close();
    }
    this._watchers.clear();
    this._debounce.clear();
    this._filePaths.clear();
  }
}

module.exports = HotReloadManager;
