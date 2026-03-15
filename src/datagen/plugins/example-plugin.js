'use strict';

// Example plugin that registers a custom generator
module.exports = {
  init({ register }) {
    register({
      name: 'randomCountry',
      generate({ rng, locale }) {
        const list = [
          'United States',
          'Germany',
          'France',
          'Türkiye',
          'Japan',
          'Brazil',
        ];
        return list[rng.integer({ min: 0, max: list.length - 1 })];
      },
    });
  },
};
