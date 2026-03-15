'use strict';

const { Readable } = require('stream');

function JsonFormatter(generator, { count }) {
  const stream = new Readable({ objectMode: true, read() {} });
  let wroteHeader = false;
  stream._read = function () {
    if (!wroteHeader) {
      this.push('[');
      wroteHeader = true;
    }

    const { value, done } = generator.next ? generator.next() : { done: true };
    if (done) {
      this.push(']');
      this.push(null);
      return;
    }

    const json = JSON.stringify(value, null, 2);
    if (this._firstRecord) {
      this._firstRecord = false;
      this.push(`\n${json}`);
    } else {
      this.push(`,\n${json}`);
    }
  };
  stream._firstRecord = true;
  return stream;
}

module.exports = { JsonFormatter };
