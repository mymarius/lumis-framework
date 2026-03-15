'use strict';

const { JsonFormatter } = require('./json');
const { CsvFormatter } = require('./csv');
const { SqlFormatter } = require('./sql');
const { MongoFormatter } = require('./mongo');

const formatters = {
  json: JsonFormatter,
  csv: CsvFormatter,
  sql: SqlFormatter,
  mongo: MongoFormatter,
};

module.exports = { formatters };
