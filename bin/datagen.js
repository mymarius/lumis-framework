#!/usr/bin/env node
'use strict';

const path = require('path');
const { runCli } = require('../src/datagen/cli');

runCli({
  argv: process.argv.slice(2),
  cwd: process.cwd(),
  rootDir: path.resolve(__dirname, '..'),
});
