<div align="center">
  <h1>🚀 Lumis-Framework</h1>
  <p><strong>Next-Gen Discord API Framework for Node.js</strong></p>
  <p>
    Lumis-Framework is a blazing-fast, lightweight, and modern Discord bot engine. Built as a powerful alternative to traditional libraries, it gives you everything you need to scale from a small server to millions of users without the spaghetti code.
  </p>
</div>

---

## 🌟 Why Lumis-Framework?

Most libraries give you raw API access and leave the heavy lifting to you. Lumis-Framework brings built-in enterprise features right out of the box, keeping your codebase clean and your memory footprint tiny.

- 🧠 **Smart Rate-Limiting:** Isolated bucket tracking, pre-emptive throttling, and global limit handling to keep you safe from API bans.
- 💾 **Multi-Adapter Cache:** Switch between Memory, Redis, or SQLite instantly. Comes with built-in LRU (Least Recently Used) clearing and TTL support.
- 🚀 **Auto Sharding:** When your bot gets huge, the `ShardingManager` automatically splits it into child processes. IPC communication (`broadcastEval`) works seamlessly.
- 🎛️ **Command & Interaction Framework:** No more messy `if/else` hell. Slash commands auto-sync with Discord. Buttons, Select Menus, and Modals are routed elegantly.
- ⏳ **Native Cooldowns:** Just add `cooldown: 5` to any command to prevent spam. Handled automatically.
- 🌐 **I18n (Localization):** Easily support multiple languages with built-in locale files (`tr.json`, `en.json`).
- 📦 **Plugin System:** Modularize your bot with lifecycle hooks (`onLoad`, `onReady`, `onUnload`) instead of dumping everything into one folder.
- 🎮 **Game & Economy Engine:** Building an RPG or Economy bot? Use the built-in `EconomyManager` (balances & transfers), `InventoryManager` (items & pets), `LevelingSystem` (anti-spam XP), and `GameSessionManager` (turn-based timeouts).
- 🎧 **Music & Guild Management:** Built-in hooks for Voice Channels (`MusicManager`) and advanced moderation/registration (Name History, Auto-Roles) via `GuildManager`.

---

## 🛠️ Installation

```bash
npm install ws undici
```
*(Optional: Install `ioredis` for Redis caching or `better-sqlite3` for SQLite caching.)*

---

## 📚 Quick Start

```javascript
const { Client, Intents } = require('./lumis-framework');

const client = new Client({
  intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES, Intents.FLAGS.MESSAGE_CONTENT]
});

client.on('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`);
});

client.on('messageCreate', async (message) => {
  if (message.content === '!ping') {
    message.reply(`Pong! 🏓 Gateway Ping: ${client.ping}ms`);
  }
});

client.login('YOUR_TOKEN_HERE');
```

---

## 💡 Advanced Features (Scaling Up)

### Enterprise Sharding
For massive bots, create an `index.js` and spawn your shards:

```javascript
const { ShardingManager } = require('./lumis-framework');

const manager = new ShardingManager('./bot.js', {
  token: 'YOUR_TOKEN',
  totalShards: 'auto'
});

manager.on('shardCreate', shard => console.log(`Launched Shard #${shard.id}`));
manager.spawn();
```

### Slash Commands & Handlers
Built-in interaction routing makes building complex bots a breeze.

```javascript
const { Command } = require('./lumis-framework');

class Ping extends Command {
  constructor() {
    super({
      name: 'ping',
      description: 'Check bot latency',
      cooldown: 5 // 5 second cooldown
    });
  }

  async execute(interaction) {
    await interaction.reply({ content: 'Pong!', ephemeral: true });
  }
}

module.exports = Ping;
```

### 🎧 Music & Guild Management 

Lumis includes a built-in `MusicManager` that can integrate with a Lavalink audio node to stream audio into voice channels.

#### 1) Lavalink / Dependencies
Lavalink itself does not send audio from Node; it handles voice streaming internally. You will need these dependencies:

- `@discordjs/voice`
- `opusscript` (or `@discordjs/opus` with proper prebuilt binaries)

> Note: You must run a Lavalink server yourself (or use a service) and configure the `music.nodes` option in `package.json` accordingly.

#### 2) Example `!play` Command

```js
client.on('messageCreate', async (message) => {
  if (message.author.bot) return;
  if (!message.content.startsWith('!play ')) return;

  const query = message.content.slice(6).trim();
  if (!query) return message.channel.send('Please provide a song name.');

  if (!message.member.voice.channel) {
    return message.channel.send('You must join a voice channel first.');
  }

  const player = client.music.createConnection({
    guildId: message.guild.id,
    voiceChannel: message.member.voice.channel.id,
    textChannel: message.channel.id
  });

  const resolved = await client.music.resolve({
    query,
    requester: message.member
  });

  if (!resolved.tracks.length) {
    return message.channel.send('No results found.');
  }

  player.queue.add(...resolved.tracks);
  await player.play();

  message.channel.send(`Now playing: **${resolved.tracks[0].title}**`);
});
```

#### 3) Guild Management (e.g. Registration)

```js
await client.guildManager.registerUser(member, 'Kubi', 22, {
  rolesToAdd: ['MALE_ROLE_ID'],
  rolesToRemove: ['UNREGISTER_ROLE_ID'],
  nameFormat: '{name} | {age}'
});

const history = await client.guildManager.getNameHistory(member.id, member.guildId);
console.log(history); // [{ name: "Kubi | 22", reason: "Register", date: 167... }]
```

---

📝 **License:** MIT
👨‍💻 **Developed by:** Lumis-Framework Team
