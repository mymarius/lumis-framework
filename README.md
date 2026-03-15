<div align="center">
  <h1>🚀 Lumis-Framework</h1>
  <p><strong>Next-Gen Discord API Framework for Node.js</strong></p>
  <p>
    Lumis-Framework is a blazing-fast, feature-rich Discord bot framework with built-in <b>middleware pipeline</b>, <b>guard system</b>, <b>hot-reload</b>, <b>dashboard</b>, <b>dependency injection</b>, <b>event interceptors</b>, <b>testing framework</b>, and <b>CLI</b> — all out of the box.
  </p>

  <p>
    <a href="https://www.npmjs.com/package/lumis-framework"><img src="https://img.shields.io/npm/v/lumis-framework.svg?style=flat-square&color=5865F2" alt="npm version"></a>
    <a href="https://www.npmjs.com/package/lumis-framework"><img src="https://img.shields.io/npm/dt/lumis-framework.svg?style=flat-square&color=5865F2" alt="npm downloads"></a>
    <img src="https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen?style=flat-square" alt="node version">
    <img src="https://img.shields.io/badge/license-MIT-blue?style=flat-square" alt="license">
  </p>
</div>

---

## 🌟 Why Lumis-Framework?

Most Discord libraries give you raw API access and leave the heavy lifting to you. **Lumis-Framework** is the only Discord framework that brings **enterprise-grade architecture patterns** out of the box.

### What Makes Lumis Different?

| Feature                       |   discord.js   |      eris      |   oceanic.js   |    **Lumis**     |
| ----------------------------- | :------------: | :------------: | :------------: | :--------------: |
| REST / WebSocket              |       ✅       |       ✅       |       ✅       |        ✅        |
| Caching (Memory/Redis/SQLite) | ⚠️ Memory only | ⚠️ Memory only | ⚠️ Memory only | ✅ Multi-Adapter |
| **Middleware Pipeline**       |       ❌       |       ❌       |       ❌       |        ✅        |
| **Guard System**              |       ❌       |       ❌       |       ❌       |        ✅        |
| **Hot-Reload Commands**       |       ❌       |       ❌       |       ❌       |        ✅        |
| **Built-in Dashboard API**    |       ❌       |       ❌       |       ❌       |        ✅        |
| **Dependency Injection**      |       ❌       |       ❌       |       ❌       |        ✅        |
| **Event Interceptors**        |       ❌       |       ❌       |       ❌       |        ✅        |
| **Built-in Testing**          |       ❌       |       ❌       |       ❌       |        ✅        |
| **CLI Tool**                  |       ❌       |       ❌       |       ❌       |        ✅        |
| Plugin System                 |       ❌       |       ❌       |       ❌       |        ✅        |
| i18n / Localization           |       ❌       |       ❌       |       ❌       |        ✅        |
| Game & Economy Engine         |       ❌       |       ❌       |       ❌       |        ✅        |
| Auto Sharding                 |       ✅       |       ❌       |       ❌       |        ✅        |
| Native Cooldowns              |       ❌       |       ❌       |       ❌       |        ✅        |

---

## 🛠️ Installation

```bash
npm install lumis-framework
```

_(Optional: `ioredis` for Redis caching, `better-sqlite3` for SQLite caching)_

---

## 📦 Quick Start with CLI

```bash
# Create a new bot project
npx lumis init my-bot

# Generate components
npx lumis generate command ban
npx lumis generate plugin welcome
npx lumis generate event guildMemberAdd
npx lumis generate middleware auth

# Check project health
npx lumis doctor
```

---

## 🧪 Built-in Data Generator (Mock Data / Seeded Fixtures)

This repository now includes a lightweight **schema-based data generator** that can produce realistic mock output for:

- 🧪 Test fixtures
- 🧱 Database seeding (SQL / Mongo)
- 🚧 Fake REST/GraphQL API responses
- 📦 CSV exports and bulk data generation

### 🧩 How it works

`lumis-datagen` reads a JSON schema (a simple JSON Schema–like format), then generates deterministic mock values using a seeded PRNG.

### 🚀 Quick start

```bash
npx lumis-datagen --schema ./examples/user-schema.json --count 100 --out ./data/users.json
```

### 🧰 Supported output formats

- **JSON** (default)
- **CSV** (`--format csv`)
- **SQL INSERT** (`--format sql`)
- **MongoDB insertOne** (`--format mongo`)

### 🔧 CLI options

```bash
npx lumis-datagen --schema ./examples/user-schema.json \
  --count 100 \                     # number of records
  --seed 1234 \                     # deterministic output (same values every run)
  --format csv \                    # json/csv/sql/mongo
  --out ./data/users.csv \          # output file (stdout if omitted)
  --batch 500 \                     # stream in chunks (big data)
  --plugin-dir ./datagen/plugins      # load custom generators
```

### 📄 Schema example (JSON)

```json
{
  "type": "object",
  "properties": {
    "id": { "type": "string", "format": "uuid" },
    "username": { "type": "string", "format": "username" },
    "email": { "type": "string", "format": "email" },
    "createdAt": { "type": "string", "format": "date" },
    "isActive": { "type": "boolean" },
    "score": { "type": "number", "minimum": 0, "maximum": 100 }
  },
  "required": ["id", "username", "email"]
}
```

### 🧩 Extend with plugins

Custom generators can be added via plugins.

Example plugin path: `src/datagen/plugins/example-plugin.js`

```js
module.exports = {
  init({ register }) {
    register({
      name: "randomCountry",
      generate({ rng }) {
        const list = ["USA", "Germany", "Türkiye", "Japan"];
        return list[rng.integer({ min: 0, max: list.length - 1 })];
      },
    });
  },
};
```

Then in schema you can use it like:

```json
{
  "type": "object",
  "properties": {
    "country": { "generator": "randomCountry" }
  }
}
```

---

## 📚 Basic Usage

```javascript
const { Client, Intents } = require("lumis-framework");

const client = new Client({
  intents: [
    Intents.FLAGS.GUILDS,
    Intents.FLAGS.GUILD_MESSAGES,
    Intents.FLAGS.MESSAGE_CONTENT,
  ],
  commands: {
    directory: "./commands",
    hotReload: true, // 🔥 Auto-reload on file change
  },
  dashboard: {
    enabled: true, // 📊 Built-in monitoring API
    port: 3000,
    auth: "my-secret-key",
  },
});

client.on("ready", () => {
  console.log(`Logged in as ${client.user.tag}!`);
});

client.login("YOUR_TOKEN");
```

---

## 🧩 Unique Features

### 1. Express.js-Style Middleware Pipeline

Chain middleware functions that run before every command — just like Express.js.

```javascript
// Global middleware — runs for ALL commands
client.use(async (ctx, next) => {
  console.log(
    `[${new Date().toISOString()}] ${ctx.user.tag} used /${ctx.commandName}`,
  );
  const start = Date.now();
  await next();
  console.log(`Command took ${Date.now() - start}ms`);
});

// Command-specific middleware
client.middleware.forCommand("ban", async (ctx, next) => {
  if (!ctx.member.permissions.has("BAN_MEMBERS")) {
    return ctx.reply({ content: "❌ No permission.", ephemeral: true });
  }
  await next();
});

// Group middleware
client.middleware.forGroup("moderation", async (ctx, next) => {
  // Runs for all commands in the "moderation" group
  await next();
});
```

---

### 2. Guard System

Declarative command guards — define who can use a command with one-liners.

```javascript
const { Command, Guards } = require("lumis-framework");

class BanCommand extends Command {
  constructor() {
    super({
      name: "ban",
      description: "Ban a user",
      guards: [
        Guards.guildOnly(), // Only in servers
        Guards.hasPermission("BAN_MEMBERS"), // Requires permission
        Guards.hasRole("MODERATOR_ROLE_ID"), // Requires role
        Guards.notBot(), // No bots
        Guards.throttle(3, "1m"), // Max 3 uses per minute
        Guards.custom((i) => i.guild.memberCount > 50, "Server too small"),
      ],
    });
  }

  async execute(interaction) {
    // If you get here, ALL guards have passed ✅
    await interaction.reply("User banned!");
  }
}
```

**Available Guards:** `guildOnly`, `dmOnly`, `hasPermission`, `hasRole`, `hasAnyRole`, `notBot`, `ownerOnly`, `nsfw`, `channelOnly`, `botHasPermission`, `inVoiceChannel`, `throttle`, `custom`

---

### 3. Hot-Reload Commands 🔥

Edit commands without restarting your bot. Perfect for development.

```javascript
const client = new Client({
  commands: {
    directory: "./commands",
    hotReload: true, // Watches files automatically
  },
});

// Or manual control:
client.hotReload.reload("ping"); // Reload specific command
client.hotReload.reloadAll(); // Reload all commands
client.hotReload.watch("./commands"); // Watch a directory

// Listen for reload events:
client.on("commandReload", (name) => {
  console.log(`🔥 Command "${name}" was reloaded!`);
});
```

---

### 4. Built-in Dashboard & Analytics API 📊

Monitor your bot with a built-in HTTP API — no external tools needed.

```javascript
const client = new Client({
  dashboard: {
    enabled: true,
    port: 3000,
    auth: "my-secret-key", // Optional Bearer token auth
  },
});

// Automatic endpoints:
// GET /api/stats     → Bot stats, memory, uptime, ping
// GET /api/guilds    → Guild list with member counts
// GET /api/commands  → Command usage statistics
// GET /api/health    → Health check (200 or 503)
// GET /api/cache     → Cache statistics
// GET /api/plugins   → Plugin list
// GET /api/services  → DI service list
// GET /api/errors    → Recent errors

// Custom routes:
client.dashboard.route("/api/custom", (req, res, client) => {
  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ custom: "data" }));
});
```

---

### 5. Event Interceptors & Transformers

Intercept, transform, or block events before they reach your handlers.

```javascript
// Enrich messages with custom data
client.intercept("messageCreate", (message) => {
  message.isSpam = message.content.length > 2000;
  message.wordCount = message.content.split(" ").length;
  return message; // Modified message
});

// Block events
client.intercept("messageCreate", (message) => {
  if (message.author.bot) return null; // Block — listeners won't fire
  return message;
});

// Priority-based interceptors
client.interceptors.add("messageCreate", myFn, {
  priority: 1,
  name: "spam-filter",
});
client.interceptors.add("messageCreate", otherFn, {
  priority: 10,
  name: "logger",
});
// Lower priority runs first
```

---

### 6. Dependency Injection Container

Register services and inject them into commands automatically.

```javascript
// Register services
client.services.register("database", new DatabaseService());
client.services.register("weather", new WeatherAPI());
client.services.register("cache", (client) => new Redis(client.config.redis), {
  singleton: true,
});

// Inject into commands
class WeatherCommand extends Command {
  inject = ["weather", "database"];

  async execute(interaction) {
    const data = await this.weather.getWeather("Germany");
    await this.database.log(interaction.user.id, "weather");
    await interaction.reply(`🌤 ${data.temp}°C in Germany`);
  }
}
```

---

### 7. Built-in Testing Framework 🧪

Test your commands without a real Discord connection.

```javascript
const { TestClient } = require("lumis-framework");

const client = new TestClient();
client.register(new PingCommand());
client.register(new BanCommand());

// Simulate a command
const result = await client.simulateCommand("ping");
result.assertReplied();
result.assertContentContains("Pong");
result.assertNoError();

// Test guards
const banResult = await client.simulateCommand("ban", {
  permissions: 0n, // No permissions
});
banResult.assertGuardFailed("hasPermission");

// Run a test suite
const report = await client.runTests([
  {
    description: "Ping replies",
    fn: async (c) => {
      const r = await c.simulateCommand("ping");
      r.assertReplied();
    },
  },
  {
    description: "Ban requires perms",
    fn: async (c) => {
      const r = await c.simulateCommand("ban", { permissions: 0n });
      r.assertGuardFailed();
    },
  },
]);

console.log(`✅ ${report.passed}/${report.total} tests passed`);
```

---

### 8. CLI Tool

Scaffold projects and generate components from the terminal.

```bash
lumis init my-bot                     # Create project with structure
lumis generate command ban            # Generate command file
lumis generate plugin welcome         # Generate plugin file
lumis generate event guildMemberAdd   # Generate event handler
lumis generate middleware auth        # Generate middleware
lumis doctor                          # Check project health
```

---

## 🎯 Additional Built-in Features

### Slash Commands & Cooldowns

```javascript
const { Command } = require("lumis-framework");

class Ping extends Command {
  constructor() {
    super({
      name: "ping",
      description: "Check bot latency",
      cooldown: 5, // 5 second cooldown
    });
  }

  async execute(interaction) {
    await interaction.reply({
      content: `🏓 Pong! ${interaction.client.ping}ms`,
      ephemeral: true,
    });
  }
}

module.exports = Ping;
```

### Enterprise Sharding

```javascript
const { ShardingManager } = require("lumis-framework");

const manager = new ShardingManager("./bot.js", {
  token: "YOUR_TOKEN",
  totalShards: "auto",
});

manager.on("shardCreate", (shard) =>
  console.log(`Launched Shard #${shard.id}`),
);
manager.spawn();
```

### Plugin System

```javascript
const { Plugin } = require("lumis-framework");

class WelcomePlugin extends Plugin {
  constructor() {
    super({ name: "welcome", version: "1.0.0" });
  }

  onLoad(client) {
    client.on("guildMemberAdd", (member) => {
      member.guild.systemChannel?.send(`Welcome ${member}! 🎉`);
    });
  }
}

client.plugins.load(new WelcomePlugin());
```

### Multi-Adapter Cache

```javascript
// Memory (default)
new Client({ cache: { adapter: "memory", maxSize: 10000 } });

// Redis
new Client({ cache: { adapter: "redis", url: "redis://localhost:6379" } });

// SQLite
new Client({ cache: { adapter: "sqlite", path: "./cache.db" } });
```

### i18n / Localization

```javascript
const client = new Client({
  locale: "tr",
  localesDirectory: "./locales",
});

// locales/tr.json: { "welcome": "welcome, {name}!" }
client.t("welcome", { name: "mymarius" }); // "welcome, mymarius!"
```

### Game & Economy Engine

```javascript
// Economy
await client.economy.addBalance(userId, guildId, 500);
const balance = await client.economy.getBalance(userId, guildId);
await client.economy.transfer(fromId, toId, guildId, 100);

// Leveling (anti-spam XP)
client.on("messageCreate", (msg) => {
  client.leveling.addXP(msg.author.id, msg.guild.id, 15);
});

// Inventory
await client.inventory.addItem(userId, guildId, {
  name: "Sword",
  rarity: "Legendary",
});

// Guild Management
await client.guildManager.registerUser(member, "mymarius", 22, {
  rolesToAdd: ["ROLE_ID"],
  nameFormat: "{name} | {age}",
});
```

### Music Manager

```javascript
const player = client.music.createConnection({
  guildId: guild.id,
  voiceChannel: voiceChannel.id,
  textChannel: textChannel.id,
});

const result = await client.music.resolve({ query: "Never Gonna Give You Up" });
player.queue.add(...result.tracks);
await player.play();
```

---

## 📁 Project Structure

```
lumis-framework/
├── bin/
│   └── lumis.js              # CLI tool
├── src/
│   ├── client/               # Client & ShardingManager
│   ├── cache/                # Multi-adapter cache (Memory, Redis, SQLite)
│   ├── dashboard/            # Built-in HTTP dashboard & analytics
│   ├── di/                   # Dependency injection container
│   ├── errors/               # Custom error types
│   ├── game/                 # Economy, inventory, leveling, music
│   ├── guards/               # Command guard system
│   ├── hotreload/            # Hot-reload command system
│   ├── i18n/                 # Internationalization
│   ├── interceptors/         # Event interceptors & transformers
│   ├── interactions/         # Command & interaction handling
│   ├── middleware/           # Express.js-style middleware pipeline
│   ├── plugins/              # Plugin system with lifecycle hooks
│   ├── rest/                 # REST API client & rate limiter
│   ├── structures/           # Discord data structures
│   ├── testing/              # Built-in test framework
│   ├── utils/                # Collection, Constants, Logger, etc.
│   └── ws/                   # WebSocket manager
└── index.js                  # Main entry point
```

---

## 📊 Full API Overview

| Module           | Key Classes                                                                                                  |
| ---------------- | ------------------------------------------------------------------------------------------------------------ |
| **Core**         | `Client`, `ShardingManager`                                                                                  |
| **Middleware**   | `MiddlewareManager`                                                                                          |
| **Guards**       | `Guards` (14 built-in guards)                                                                                |
| **Hot-Reload**   | `HotReloadManager`                                                                                           |
| **Dashboard**    | `DashboardManager`                                                                                           |
| **DI Container** | `ServiceContainer`                                                                                           |
| **Interceptors** | `EventInterceptor`                                                                                           |
| **Testing**      | `TestClient`, `TestResult`                                                                                   |
| **Interactions** | `Command`, `CommandManager`, `InteractionHandler`, `CooldownManager`                                         |
| **Cache**        | `CacheManager`, `MemoryAdapter`, `RedisAdapter`, `SQLiteAdapter`                                             |
| **Plugins**      | `Plugin`, `PluginManager`                                                                                    |
| **i18n**         | `I18nManager`                                                                                                |
| **Game**         | `EconomyManager`, `InventoryManager`, `LevelingSystem`, `GameSessionManager`, `GuildManager`, `MusicManager` |
| **Structures**   | `User`, `Guild`, `Channel`, `Message`, `Member`, `Role`, `Embed`, `Interaction`                              |
| **REST**         | `RESTManager`, `RateLimiter`, `APIRouter`                                                                    |
| **WebSocket**    | `WebSocketManager`                                                                                           |
| **Errors**       | `LumisError`, `APIError`, `WebSocketError`, `RateLimitError`                                                 |

---

📝 **License:** MIT
👨‍💻 **Developed by:** Lumis-Framework Team
💬 **Discord:** [Our Server](https://discord.gg/32xTVz9yN3)
💬 **Github:** [Github Adress](https://github.com/mymarius)
