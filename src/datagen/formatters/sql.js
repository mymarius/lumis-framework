'use strict';

const { Readable } = require('stream');

function SqlFormatter(generator, { schema }) {
  const stream = new Readable({ objectMode: true, read() {} });
  const table = schema.table || 'data';
  const columns = Object.keys(schema.properties || {});

  stream._read = function () {
    const { value, done } = generator.next ? generator.next() : { done: true };
    if (done) {
      this.push(null);
      return;
    }

    const values = columns
      .map((col) => {
        const val = value[col];
        if (val === null || val === undefined) return 'NULL';
        if (typeof val === 'number' || typeof val === 'boolean') return val;
        return `'${String(val).replace(/'/g, "''")}'`;
      })
      .join(', ');

    this.push(`INSERT INTO ${table} (${columns.join(', ')}) VALUES (${values});\n`);
  };

  return stream;
}

module.exports = { SqlFormatter };
