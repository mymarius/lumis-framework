'use strict';

const { createSeededRandom } = require('../utils/seed');
const { faker } = require('@faker-js/faker');

const TYPE_GENERATORS = {
  string: ({ schema, rng, locale }) => {
    if (schema.enum) return rng.pick(schema.enum);
    if (schema.format) {
      switch (schema.format) {
        case 'uuid':
          return faker.string.uuid();
        case 'email':
          return faker.internet.email();
        case 'url':
          return faker.internet.url();
        case 'date':
          return faker.date.past().toISOString();
        default:
          break;
      }
    }
    if (schema.pattern) {
      return schema.pattern;
    }
    const length = schema.minLength || 3;
    return faker.string.alpha(length);
  },

  number: ({ schema, rng }) => {
    const min = typeof schema.minimum === 'number' ? schema.minimum : 0;
    const max = typeof schema.maximum === 'number' ? schema.maximum : min + 100;
    return rng.number({ min, max });
  },

  integer: ({ schema, rng }) => {
    const min = typeof schema.minimum === 'number' ? schema.minimum : 0;
    const max = typeof schema.maximum === 'number' ? schema.maximum : min + 100;
    return rng.integer({ min, max });
  },

  boolean: ({ rng }) => rng.boolean(),

  object: ({ schema, rng, locale, pluginManager }) => {
    const result = {};
    const props = schema.properties || {};
    for (const [key, propSchema] of Object.entries(props)) {
      result[key] = generateBySchema({ schema: propSchema, rng, locale, pluginManager });
    }
    return result;
  },

  array: ({ schema, rng, locale, pluginManager }) => {
    const minItems = schema.minItems || 1;
    const maxItems = schema.maxItems || minItems;
    const length = rng.integer({ min: minItems, max: maxItems });
    const items = [];
    for (let i = 0; i < length; i += 1) {
      items.push(generateBySchema({ schema: schema.items || {}, rng, locale, pluginManager }));
    }
    return items;
  },
};

function generateBySchema({ schema = {}, rng, locale, pluginManager }) {
  if (schema === null || schema === undefined) return null;
  if (schema.const !== undefined) return schema.const;
  if (schema.default !== undefined) return schema.default;

  if (schema.generator && pluginManager) {
    const plugin = pluginManager.getGenerator(schema.generator);
    if (plugin && typeof plugin.generate === 'function') {
      return plugin.generate({ schema, rng, locale });
    }
  }

  const type = schema.type || (schema.properties ? 'object' : schema.items ? 'array' : 'string');
  const generator = TYPE_GENERATORS[type];
  if (!generator) {
    return null;
  }

  return generator({ schema, rng, locale, pluginManager });
}

class SchemaGenerator {
  constructor({ schema, seed, locale = 'en', pluginManager } = {}) {
    this.schema = schema;
    this.locale = locale;
    // The built-in faker export is used for realistic mock values.
    // Locale support is currently limited to the parent faker instance.
    this.rng = createSeededRandom(seed, { locale });
    this.pluginManager = pluginManager;
  }

  generate() {
    return generateBySchema({ schema: this.schema, rng: this.rng, locale: this.locale, pluginManager: this.pluginManager });
  }
}

module.exports = { SchemaGenerator };
