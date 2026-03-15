'use strict';

const { Readable } = require('stream');

function CsvFormatter(generator, { schema }) {
  const stream = new Readable({ objectMode: true, read() {} });
  const fields = Object.keys(schema.properties || {});
  let headerWritten = false;

  const toCsv = (record) => {
    return fields
      .map((key) => {
        let value = record[key];
        if (value === undefined || value === null) return '';
        const str = String(value);
        // escape "
        const escaped = str.replace(/"/g, '""');
        if (escaped.includes(',') || escaped.includes('"') || escaped.includes('\n')) {
          return `"${escaped}"`;
        }
        return escaped;
      })
      .join(',');
  };

  stream._read = function () {
    if (!headerWritten) {
      this.push(fields.join(',') + '\n');
      headerWritten = true;
      return;
    }

    const { value, done } = generator.next ? generator.next() : { done: true };
    if (done) {
      this.push(null);
      return;
    }

    this.push(toCsv(value) + '\n');
  };

  return stream;
}

module.exports = { CsvFormatter };
