'use strict';

class Logger {
  
  constructor(options = {}) {
    this.prefix = options.prefix || 'Lumis';
    this.level = options.level || 'info';
    this.timestamps = options.timestamps !== false;
    this.colors = options.colors !== false;

    this.levels = {
      debug: 0,
      info: 1,
      warn: 2,
      error: 3,
      none: 4,
    };
  }

  _shouldLog(level) {
    return this.levels[level] >= this.levels[this.level];
  }

  _timestamp() {
    if (!this.timestamps) return '';
    const now = new Date();
    const time = now.toLocaleTimeString('tr-TR', { hour12: false });
    return this.colors ? `\x1b[90m${time}\x1b[0m ` : `${time} `;
  }

  _format(level) {
    const colors = {
      debug: '\x1b[36m',   // Cyan
      info: '\x1b[34m',    // Blue
      warn: '\x1b[33m',    // Yellow
      error: '\x1b[31m',   // Red
      success: '\x1b[32m', // Green
    };

    const icons = {
      debug: '🔍',
      info: '📘',
      warn: '⚠️',
      error: '❌',
      success: '✅',
    };

    const reset = '\x1b[0m';
    const bold = '\x1b[1m';

    if (this.colors) {
      return `${this._timestamp()}${colors[level]}${bold}[${this.prefix}]${reset} ${icons[level]} `;
    }
    return `${this._timestamp()}[${this.prefix}] [${level.toUpperCase()}] `;
  }

  debug(...args) {
    if (this._shouldLog('debug')) {
      console.log(this._format('debug'), ...args);
    }
  }

  info(...args) {
    if (this._shouldLog('info')) {
      console.log(this._format('info'), ...args);
    }
  }

  warn(...args) {
    if (this._shouldLog('warn')) {
      console.warn(this._format('warn'), ...args);
    }
  }

  error(...args) {
    if (this._shouldLog('error')) {
      console.error(this._format('error'), ...args);
    }
  }

  success(...args) {
    if (this._shouldLog('info')) {
      console.log(this._format('success'), ...args);
    }
  }

  setLevel(level) {
    if (this.levels[level] === undefined) {
      throw new Error(`Invalid log level: ${level}. Valid: ${Object.keys(this.levels).join(', ')}`);
    }
    this.level = level;
  }
}

module.exports = Logger;
