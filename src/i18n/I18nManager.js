'use strict';

const path = require('node:path');
const fs = require('node:fs');
const Logger = require('../utils/Logger');

class I18nManager {
  
  constructor(options = {}) {
    
    this.locale = options.locale || 'en';

    this.fallback = options.fallback || 'en';

    this.locales = new Map();

    this.logger = new Logger({ prefix: 'I18n', level: 'info' });

    this._loadBuiltinLocales();

    if (options.directory) {
      this.loadDirectory(options.directory);
    }
  }

  _loadBuiltinLocales() {
    const localesDir = path.join(__dirname, 'locales');

    try {
      if (fs.existsSync(localesDir)) {
        const files = fs.readdirSync(localesDir).filter((f) => f.endsWith('.json'));
        for (const file of files) {
          const locale = path.basename(file, '.json');
          const data = JSON.parse(fs.readFileSync(path.join(localesDir, file), 'utf8'));
          this.locales.set(locale, data);
          this.logger.debug(`Internal translation loaded: ${locale}`);
        }
      }
    } catch (error) {
      this.logger.warn(`Internal translations could not be loaded: ${error.message}`);
    }
  }

  loadDirectory(directory) {
    try {
      const files = fs.readdirSync(directory).filter((f) => f.endsWith('.json'));
      for (const file of files) {
        const locale = path.basename(file, '.json');
        const data = JSON.parse(fs.readFileSync(path.join(directory, file), 'utf8'));

        const existing = this.locales.get(locale) || {};
        this.locales.set(locale, this._deepMerge(existing, data));

        this.logger.info(`Translation loaded: ${locale} (${directory})`);
      }
    } catch (error) {
      this.logger.error(`Translation directory could not be read: ${error.message}`);
    }
  }

  setLocale(locale) {
    this.locale = locale;
    this.logger.info(`Dil değiştirildi: ${locale}`);
  }

  addLocale(locale, translations) {
    const existing = this.locales.get(locale) || {};
    this.locales.set(locale, this._deepMerge(existing, translations));
    this.logger.info(`Çeviri eklendi/güncellendi: ${locale}`);
  }

  t(key, replacements = {}, locale) {
    const effectiveLocale = locale || this.locale;

    let value = this._getNestedValue(this.locales.get(effectiveLocale), key);

    if (value === undefined && effectiveLocale !== this.fallback) {
      value = this._getNestedValue(this.locales.get(this.fallback), key);
    }

    if (value === undefined) {
      return key;
    }

    return this._interpolate(value, replacements);
  }

  getTranslations(locale) {
    return this.locales.get(locale || this.locale) || {};
  }

  getAvailableLocales() {
    return [...this.locales.keys()];
  }

  has(key, locale) {
    const effectiveLocale = locale || this.locale;
    return this._getNestedValue(this.locales.get(effectiveLocale), key) !== undefined;
  }

  _getNestedValue(obj, key) {
    if (!obj) return undefined;
    const parts = key.split('.');
    let current = obj;
    for (const part of parts) {
      if (current === undefined || current === null) return undefined;
      current = current[part];
    }
    return current;
  }

  _interpolate(str, replacements) {
    if (typeof str !== 'string') return str;
    return str.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return replacements[key] !== undefined ? replacements[key] : match;
    });
  }

  _deepMerge(target, source) {
    const result = { ...target };
    for (const key of Object.keys(source)) {
      if (
        source[key] &&
        typeof source[key] === 'object' &&
        !Array.isArray(source[key]) &&
        result[key] &&
        typeof result[key] === 'object'
      ) {
        result[key] = this._deepMerge(result[key], source[key]);
      } else {
        result[key] = source[key];
      }
    }
    return result;
  }
}

module.exports = I18nManager;
