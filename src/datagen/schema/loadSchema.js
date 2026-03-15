'use strict';

const fs = require('fs');

function loadSchema(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8');
  try {
    return JSON.parse(raw);
  } catch (err) {
    throw new Error(`Unable to parse schema JSON: ${err.message}`);
  }
}

module.exports = { loadSchema };
