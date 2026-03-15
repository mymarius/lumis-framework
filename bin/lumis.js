#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const TEMPLATES = {
  command: `'use strict';

const { Command } = require('lumis-framework');

class {{ClassName}} extends Command {
  constructor() {
    super({
      name: '{{name}}',
      description: '{{description}}',
      cooldown: 3,
      guards: [],
    });
  }

  async execute(interaction) {
    await interaction.reply({ content: 'Hello from {{name}}!' });
  }
}

module.exports = {{ClassName}};
`,

  plugin: `'use strict';

const { Plugin } = require('lumis-framework');

class {{ClassName}} extends Plugin {
  constructor() {
    super({
      name: '{{name}}',
      version: '1.0.0',
      description: '{{description}}',
    });
  }

  onLoad(client) {
    client.logger.info('{{ClassName}} loaded!');
  }

  onReady(client) {
    client.logger.info('{{ClassName}} ready!');
  }

  onUnload(client) {
    client.logger.info('{{ClassName}} unloaded!');
  }
}

module.exports = {{ClassName}};
`,

  event: `'use strict';

module.exports = {
  name: '{{name}}',
  once: false,

  execute(client, ...args) {
    client.logger.info('Event {{name}} triggered!');
  }
};
`,

  bot: `'use strict';

const { Client, Intents } = require('lumis-framework');

const client = new Client({
  intents: [
    Intents.FLAGS.GUILDS,
    Intents.FLAGS.GUILD_MESSAGES,
    Intents.FLAGS.MESSAGE_CONTENT,
  ],
  commands: {
    directory: './commands',
    hotReload: true,
  },
  dashboard: {
    enabled: true,
    port: 3000,
    auth: 'change-me',
  },
});

client.on('ready', () => {
  console.log(\`✅ Bot is ready as \${client.user.tag}!\`);
});

client.on('messageCreate', (message) => {
  if (message.author.bot) return;
  if (message.content === '!ping') {
    message.reply(\`🏓 Pong! \${client.ping}ms\`);
  }
});

client.login(process.env.DISCORD_TOKEN || 'YOUR_TOKEN_HERE');
`,

  middleware: `'use strict';

/**
 * Example middleware: logs all interactions
 */
module.exports = async function loggingMiddleware(ctx, next) {
  const start = Date.now();
  console.log(\`[CMD] \${ctx.commandName} by \${ctx.user?.tag}\`);
  
  await next();
  
  console.log(\`[CMD] \${ctx.commandName} completed in \${Date.now() - start}ms\`);
};
`,
};

const COLORS = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

function log(msg, color = 'reset') {
  console.log(`${COLORS[color]}${msg}${COLORS.reset}`);
}

function success(msg) { log(`  ✅ ${msg}`, 'green'); }
function error(msg) { log(`  ❌ ${msg}`, 'red'); }
function info(msg) { log(`  ℹ️  ${msg}`, 'cyan'); }
function warn(msg) { log(`  ⚠️  ${msg}`, 'yellow'); }

function toPascalCase(str) {
  return str.replace(/(^|[-_ ])(\w)/g, (_, __, c) => c.toUpperCase());
}

function createFile(filePath, content) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  if (fs.existsSync(filePath)) {
    warn(`File already exists: ${filePath}`);
    return false;
  }
  fs.writeFileSync(filePath, content, 'utf-8');
  success(`Created: ${filePath}`);
  return true;
}

// ---- CLI Commands ----

function cmdInit(name) {
  const projectDir = path.resolve(name || '.');
  log(`\n🚀 Initializing Lumis project: ${name || '.'}`, 'bright');

  if (name && !fs.existsSync(projectDir)) {
    fs.mkdirSync(projectDir, { recursive: true });
  }

  // Create directories
  ['commands', 'events', 'plugins', 'middleware', 'locales'].forEach(dir => {
    const dirPath = path.join(projectDir, dir);
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
      success(`Created directory: ${dir}/`);
    }
  });

  // Create bot.js
  createFile(path.join(projectDir, 'bot.js'), TEMPLATES.bot);

  // Create sample command
  const pingContent = TEMPLATES.command
    .replace(/\{\{ClassName\}\}/g, 'Ping')
    .replace(/\{\{name\}\}/g, 'ping')
    .replace(/\{\{description\}\}/g, 'Check bot latency');
  createFile(path.join(projectDir, 'commands', 'ping.js'), pingContent);

  // Create .env
  createFile(path.join(projectDir, '.env'), 'DISCORD_TOKEN=your_token_here\n');

  // Create .gitignore
  createFile(path.join(projectDir, '.gitignore'), 'node_modules/\n.env\n');

  log(`\n  🎉 Project initialized! Next steps:`, 'green');
  info(`cd ${name || '.'}`);
  info(`npm install lumis-framework`);
  info(`Edit .env with your Discord token`);
  info(`node bot.js`);
  console.log();
}

function cmdGenerate(type, name) {
  if (!type) {
    error('Usage: lumis generate <command|plugin|event|middleware> <name>');
    return;
  }
  if (!name) {
    error(`Please provide a name: lumis generate ${type} <name>`);
    return;
  }

  log(`\n📦 Generating ${type}: ${name}`, 'bright');

  const className = toPascalCase(name);
  const template = TEMPLATES[type];
  if (!template) {
    error(`Unknown type: ${type}. Available: command, plugin, event, middleware`);
    return;
  }

  const dirs = { command: 'commands', plugin: 'plugins', event: 'events', middleware: 'middleware' };
  const dirName = dirs[type] || type;

  const content = template
    .replace(/\{\{ClassName\}\}/g, className)
    .replace(/\{\{name\}\}/g, name)
    .replace(/\{\{description\}\}/g, `${className} ${type}`);

  createFile(path.join(process.cwd(), dirName, `${name}.js`), content);
  console.log();
}

function cmdDoctor() {
  log('\n🔍 Lumis Doctor: Checking project health...', 'bright');
  let issues = 0;

  // Check package.json
  if (fs.existsSync('package.json')) {
    success('package.json found');
    const pkg = JSON.parse(fs.readFileSync('package.json', 'utf-8'));
    if (pkg.dependencies?.['lumis-framework'] || pkg.dependencies?.['nexcord']) {
      success('lumis-framework is in dependencies');
    } else {
      warn('lumis-framework not found in dependencies');
      issues++;
    }
  } else {
    error('package.json not found');
    issues++;
  }

  // Check .env
  if (fs.existsSync('.env')) {
    const env = fs.readFileSync('.env', 'utf-8');
    if (env.includes('DISCORD_TOKEN') && !env.includes('your_token_here')) {
      success('Discord token is configured');
    } else {
      warn('Discord token may not be set in .env');
      issues++;
    }
  } else {
    warn('.env file not found');
    issues++;
  }

  // Check directories
  ['commands', 'events', 'plugins'].forEach(dir => {
    if (fs.existsSync(dir)) {
      const files = fs.readdirSync(dir).filter(f => f.endsWith('.js'));
      success(`${dir}/ found (${files.length} files)`);
    } else {
      info(`${dir}/ directory not found (optional)`);
    }
  });

  // Check Node version
  const nodeVersion = parseInt(process.versions.node.split('.')[0], 10);
  if (nodeVersion >= 18) {
    success(`Node.js v${process.versions.node} (✓ >= 18)`);
  } else {
    error(`Node.js v${process.versions.node} (requires >= 18)`);
    issues++;
  }

  console.log();
  if (issues === 0) {
    log('  🎉 No issues found! Your project looks healthy.', 'green');
  } else {
    log(`  ⚠️  Found ${issues} issue(s). See above for details.`, 'yellow');
  }
  console.log();
}

function cmdHelp() {
  log(`
${COLORS.bright}🚀 Lumis CLI${COLORS.reset}
  
  ${COLORS.cyan}Usage:${COLORS.reset}
    lumis <command> [options]

  ${COLORS.cyan}Commands:${COLORS.reset}
    ${COLORS.green}init [name]${COLORS.reset}                  Create a new Lumis bot project
    ${COLORS.green}generate <type> <name>${COLORS.reset}       Generate a component (command, plugin, event, middleware)
    ${COLORS.green}doctor${COLORS.reset}                       Check project health and configuration
    ${COLORS.green}help${COLORS.reset}                         Show this help message
    ${COLORS.green}version${COLORS.reset}                      Show CLI version

  ${COLORS.cyan}Examples:${COLORS.reset}
    lumis init my-bot
    lumis generate command ban
    lumis generate plugin welcome
    lumis generate event guildMemberAdd
    lumis generate middleware auth
    lumis doctor
`);
}

// ---- Entry Point ----
const args = process.argv.slice(2);
const command = args[0];

switch (command) {
  case 'init':
    cmdInit(args[1]);
    break;
  case 'generate':
  case 'gen':
  case 'g':
    cmdGenerate(args[1], args[2]);
    break;
  case 'doctor':
  case 'check':
    cmdDoctor();
    break;
  case 'version':
  case '-v':
  case '--version':
    log(`lumis-framework CLI v1.1.1`);
    break;
  case 'help':
  case '-h':
  case '--help':
  default:
    cmdHelp();
    break;
}
