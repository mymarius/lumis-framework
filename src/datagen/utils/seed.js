'use strict';

const seedrandom = require('seedrandom');

function createSeededRandom(seed, { locale } = {}) {
  const rng = seedrandom(String(seed || Date.now()));

  return {
    number({ min = 0, max = 1 }) {
      return rng() * (max - min) + min;
    },
    integer({ min = 0, max = 100 }) {
      return Math.floor(rng() * (max - min + 1)) + min;
    },
    boolean() {
      return rng() >= 0.5;
    },
    pick(array) {
      if (!Array.isArray(array) || array.length === 0) return null;
      const idx = Math.floor(rng() * array.length);
      return array[idx];
    },
  };
}

module.exports = { createSeededRandom };
