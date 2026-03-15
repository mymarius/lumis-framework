'use strict';

const { SchemaGenerator } = require('./schema/SchemaGenerator');

class DataGenerator {
  /**
   * @param {object} options
   * @param {object} options.schema
   * @param {string|number} [options.seed]
   * @param {string} [options.locale]
   * @param {PluginManager} [options.pluginManager]
   */
  constructor({ schema, seed, locale = 'en', pluginManager } = {}) {
    this.schema = schema;
    this.seed = seed;
    this.locale = locale;
    this.pluginManager = pluginManager;
    this.generator = new SchemaGenerator({ schema, seed, locale, pluginManager });
  }

  generate() {
    return this.generator.generate();
  }
}

module.exports = { DataGenerator };
