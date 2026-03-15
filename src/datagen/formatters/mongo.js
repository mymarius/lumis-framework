'use strict';

const { Readable } = require('stream');

function MongoFormatter(generator, { schema }) {
  const collection = schema.collection || 'data';
  const stream = new Readable({ objectMode: true, read() {} });

  stream._read = function () {
    const { value, done } = generator.next ? generator.next() : { done: true };
    if (done) {
      this.push(null);
      return;
    }

    this.push(`db.getCollection('${collection}').insertOne(${JSON.stringify(value, null, 2)});\n`);
  };

  return stream;
}

module.exports = { MongoFormatter };
