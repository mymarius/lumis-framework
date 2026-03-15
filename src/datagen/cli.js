'use strict';

const fs = require('fs');
const path = require('path');
const { DataGenerator } = require('./DataGenerator');
const { loadSchema } = require('./schema/loadSchema');
const { formatters } = require('./formatters');
const { PluginManager } = require('./plugin/PluginManager');

function parseArgs(argv) {
  const args = {};
  let i = 0;
  while (i < argv.length) {
    const arg = argv[i];
    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      const next = argv[i + 1];
      if (next && !next.startsWith('--')) {
        args[key] = next;
        i += 2;
      } else {
        args[key] = true;
        i += 1;
      }
    } else {
      // positional
      if (!args._) args._ = [];
      args._.push(arg);
      i += 1;
    }
  }
  return args;
}

function showHelp() {
  console.log(`
lumis-datagen — schema-based mock data generator

Usage:
  lumis-datagen --schema schema.json --count 1000 --out out.json [options]

Options:
  --schema <file>        JSON schema file (required)
  --count <n>            Number of records to generate (default: 1)
  --out <file>           Output file path (default: stdout)
  --format <fmt>         Output format: json|csv|sql|mongo (default: json)
  --seed <value>         Deterministic seed for repeatable data
  --locale <locale>      Locale for locale-aware generators (default: en)
  --plugin-dir <dir>     Path to load plugins from
  --batch <size>         Batch size for streaming output
  --help                 Show this help message
`);
}

function ensureExists(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }
}

function runCli({ argv, cwd, rootDir }) {
  const opts = parseArgs(argv);
  if (opts.help || opts.h) {
    showHelp();
    process.exit(0);
  }

  const schemaPath = opts.schema || opts.s;
  if (!schemaPath) {
    console.error('Error: --schema is required');
    showHelp();
    process.exit(1);
  }

  const schemaFile = path.isAbsolute(schemaPath) ? schemaPath : path.join(cwd, schemaPath);
  ensureExists(schemaFile);

  const count = Number(opts.count || opts.c || 1);
  const outPath = opts.out || opts.o;
  const format = (opts.format || 'json').toLowerCase();
  const seed = opts.seed || opts._seed || undefined;
  const locale = opts.locale || 'en';
  const pluginDir = opts['plugin-dir'] || opts.p || null;
  const batchSize = Number(opts.batch || 0);

  const schema = loadSchema(schemaFile);
  const pluginManager = new PluginManager({ pluginDir, rootDir, locale });

  const generator = new DataGenerator({ schema, seed, locale, pluginManager });
  const outputFormatter = formatters[format];
  if (!outputFormatter) {
    console.error(`Unknown format: ${format}`);
    process.exit(1);
  }

  const stream = outputFormatter(streamGenerator(generator, count, batchSize), { schema, count, locale });

  if (outPath) {
    const outFile = path.isAbsolute(outPath) ? outPath : path.join(cwd, outPath);
    const writeStream = fs.createWriteStream(outFile, { encoding: 'utf8' });
    stream.pipe(writeStream);
    writeStream.on('finish', () => {
      console.log(`✅ Generated ${count} record(s) to ${outFile}`);
    });
  } else {
    stream.pipe(process.stdout);
  }
}

function* streamGenerator(generator, count, batchSize) {
  if (!batchSize || batchSize < 1) {
    for (let i = 0; i < count; i += 1) {
      yield generator.generate();
    }
    return;
  }

  let remaining = count;
  while (remaining > 0) {
    const currentBatch = Math.min(batchSize, remaining);
    const records = [];
    for (let i = 0; i < currentBatch; i += 1) {
      records.push(generator.generate());
    }
    yield records;
    remaining -= currentBatch;
  }
}

module.exports = { runCli };
