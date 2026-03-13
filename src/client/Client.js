'use strict';

const { EventEmitter } = require('node:events');
const RESTManager = require('../rest/RESTManager');
const APIRouter = require('../rest/APIRouter');
const WebSocketManager = require('../ws/WebSocketManager');
const CacheManager = require('../cache/CacheManager');
const PluginManager = require('../plugins/PluginManager');
const I18nManager = require('../i18n/I18nManager');
const EconomyManager = require('../game/EconomyManager');
const InventoryManager = require('../game/InventoryManager');
const LevelingSystem = require('../game/LevelingSystem');
const GameSessionManager = require('../game/GameSessionManager');
const GuildManager = require('../game/GuildManager');
const MusicManager = require('../game/MusicManager');
const CommandManager = require('../interactions/CommandManager');
const InteractionHandler = require('../interactions/InteractionHandler');
const { createInteraction } = require('../structures/Interaction');
const Collection = require('../utils/Collection');
const Intents = require('../utils/Intents');
const Logger = require('../utils/Logger');
const { Events } = require('../utils/Constants');
const User = require('../structures/User');
const Guild = require('../structures/Guild');
const { Channel } = require('../structures/Channel');
const Message = require('../structures/Message');
const Member = require('../structures/Member');
const { LumisError } = require('../errors/LumisError');
const { ErrorCodes } = require('../errors/ErrorCodes');

class Client extends EventEmitter {
  
  constructor(options = {}) {
    super();

    this.options = options;

    this.ready = false;

    this.user = null;

    this.token = null;

    this.intents = this._resolveIntents(options.intents);

    this.logger = new Logger({
      prefix: 'Lumis',
      level: options.logLevel || 'info',
    });

    this.rest = new RESTManager(this, { logLevel: options.logLevel });

    this.api = new APIRouter(this.rest);

    this.ws = new WebSocketManager(this, { logLevel: options.logLevel });

    this.cache = new CacheManager(options.cache || { adapter: 'memory' });

    this.plugins = new PluginManager(this);

    this.commands = new CommandManager(this, options.commands || {});

    this.interactions = new InteractionHandler(this);

    this.i18n = new I18nManager({
      locale: options.locale || 'en',
      fallback: 'en',
      directory: options.localesDirectory,
    });

    this.economy = new EconomyManager(this, options.economy || {});

    this.inventory = new InventoryManager(this);

    this.leveling = new LevelingSystem(this, options.leveling || {});

    this.games = new GameSessionManager();

    this.guildManager = new GuildManager(this);

    this.music = new MusicManager(this, options.music || {});

    this.guilds = new Collection();

    this.channels = new Collection();

    this.users = new Collection();

    this.createdAt = new Date();

    this.readyAt = null;

    this.shard = process.env.SHARD_ID ? {
      id: Number(process.env.SHARD_ID),
      count: Number(process.env.TOTAL_SHARDS) || 1,
    } : null;

    if (this.shard) {
      this._setupIPC();
    }

    this._setupWSListeners();
  }

  get uptime() {
    return this.readyAt ? Date.now() - this.readyAt.getTime() : 0;
  }

  _setupIPC() {
    process.on('message', async (message) => {
      if (!message || message._type !== 'BROADCAST_EVAL') return;

      try {

        const evalFunc = new Function('client', `return ${message.script};`);
        const result = await evalFunc(this);

        process.send({
          _type: 'EVAL_RESULT',
          _nonce: message._nonce,
          _shardId: this.shard.id,
          _result: result
        });
      } catch (err) {
        process.send({
          _type: 'EVAL_RESULT',
          _nonce: message._nonce,
          _shardId: this.shard.id,
          _error: err.message
        });
      }
    });
  }

  _setupWSListeners() {
    this.ws.on('dispatch', (eventName, data) => {
      this._handleDispatch(eventName, data);
    });

    this.ws.on('reconnecting', (attempt) => {
      this.emit(Events.RECONNECTING, attempt);
    });

    this.ws.on('disconnect', (reason) => {
      this.ready = false;
      this.emit(Events.DISCONNECT, reason);
    });

    this.ws.on('error', (error) => {
      this.emit(Events.ERROR, error);
    });
  }

  _handleDispatch(eventName, data) {
    switch (eventName) {
      case 'READY':
        this._handleReady(data);
        break;

      case 'GUILD_CREATE':
        this._handleGuildCreate(data);
        break;

      case 'GUILD_UPDATE': {
        const guild = this.guilds.get(data.id);
        if (guild) {
          const old = { ...guild };
          guild._patch(data);
          this.emit(Events.GUILD_UPDATE, old, guild);
        }
        break;
      }

      case 'GUILD_DELETE': {
        const guild = this.guilds.get(data.id);
        if (guild) {
          this.guilds.delete(data.id);

          for (const [id, channel] of this.channels) {
            if (channel.guild?.id === data.id) {
              this.channels.delete(id);
            }
          }
          this.emit(Events.GUILD_DELETE, guild);
        }
        break;
      }

      case 'CHANNEL_CREATE': {
        const guild = data.guild_id ? this.guilds.get(data.guild_id) : null;
        const channel = Channel.create(this, data, guild);
        this.channels.set(channel.id, channel);
        if (guild) guild.channels.set(channel.id, channel);
        this.emit(Events.CHANNEL_CREATE, channel);
        break;
      }

      case 'CHANNEL_UPDATE': {
        const oldChannel = this.channels.get(data.id);
        const guild = data.guild_id ? this.guilds.get(data.guild_id) : null;
        const channel = Channel.create(this, data, guild);
        this.channels.set(channel.id, channel);
        if (guild) guild.channels.set(channel.id, channel);
        this.emit(Events.CHANNEL_UPDATE, oldChannel, channel);
        break;
      }

      case 'CHANNEL_DELETE': {
        const channel = this.channels.get(data.id);
        if (channel) {
          this.channels.delete(data.id);
          if (channel.guild) channel.guild.channels.delete(data.id);
          this.emit(Events.CHANNEL_DELETE, channel);
        }
        break;
      }

      case 'MESSAGE_CREATE': {
        const channel = this.channels.get(data.channel_id);
        const message = new Message(this, data, channel);

        if (message.author) {
          this.users.set(message.author.id, message.author);
        }

        if (channel && channel.messages) {
          channel.messages.set(message.id, message);

          if (channel.messages.size > 200) {
            const oldest = channel.messages.first();
            if (oldest) channel.messages.delete(oldest.id);
          }
        }

        this.emit(Events.MESSAGE_CREATE, message);
        break;
      }

      case 'MESSAGE_UPDATE': {
        const channel = this.channels.get(data.channel_id);
        const oldMessage = channel?.messages?.get(data.id);
        const message = new Message(this, data, channel);

        if (channel && channel.messages) {
          channel.messages.set(message.id, message);
        }

        this.emit(Events.MESSAGE_UPDATE, oldMessage || null, message);
        break;
      }

      case 'MESSAGE_DELETE': {
        const channel = this.channels.get(data.channel_id);
        const message = channel?.messages?.get(data.id);

        if (channel && channel.messages) {
          channel.messages.delete(data.id);
        }

        this.emit(Events.MESSAGE_DELETE, message || { id: data.id, channelId: data.channel_id });
        break;
      }

      case 'GUILD_MEMBER_ADD': {
        const guild = this.guilds.get(data.guild_id);
        if (guild) {
          const member = new Member(this, guild, data);
          guild.members.set(member.user.id, member);
          guild.memberCount++;
          this.emit(Events.GUILD_MEMBER_ADD, member);
        }
        break;
      }

      case 'GUILD_MEMBER_UPDATE': {
        const guild = this.guilds.get(data.guild_id);
        if (guild) {
          const oldMember = guild.members.get(data.user.id);
          const member = new Member(this, guild, data);
          guild.members.set(member.user.id, member);
          this.emit(Events.GUILD_MEMBER_UPDATE, oldMember, member);
        }
        break;
      }

      case 'GUILD_MEMBER_REMOVE': {
        const guild = this.guilds.get(data.guild_id);
        if (guild) {
          const member = guild.members.get(data.user.id);
          guild.members.delete(data.user.id);
          guild.memberCount--;
          this.emit(Events.GUILD_MEMBER_REMOVE, member || data.user);
        }
        break;
      }

      case 'GUILD_ROLE_CREATE': {
        const guild = this.guilds.get(data.guild_id);
        if (guild) {
          const Role = require('../structures/Role');
          const role = new Role(this, guild, data.role);
          guild.roles.set(role.id, role);
          this.emit(Events.GUILD_ROLE_CREATE, role);
        }
        break;
      }

      case 'GUILD_ROLE_UPDATE': {
        const guild = this.guilds.get(data.guild_id);
        if (guild) {
          const Role = require('../structures/Role');
          const oldRole = guild.roles.get(data.role.id);
          const role = new Role(this, guild, data.role);
          guild.roles.set(role.id, role);
          this.emit(Events.GUILD_ROLE_UPDATE, oldRole, role);
        }
        break;
      }

      case 'GUILD_ROLE_DELETE': {
        const guild = this.guilds.get(data.guild_id);
        if (guild) {
          const role = guild.roles.get(data.role_id);
          guild.roles.delete(data.role_id);
          this.emit(Events.GUILD_ROLE_DELETE, role || { id: data.role_id });
        }
        break;
      }

      case 'INTERACTION_CREATE': {
        const interaction = createInteraction(this, data);
        this.emit(Events.INTERACTION_CREATE, interaction);
        break;
      }

      case 'VOICE_STATE_UPDATE': {
        this.emit(Events.VOICE_STATE_UPDATE, data);
        break;
      }

      case 'VOICE_SERVER_UPDATE': {
        this.emit(Events.VOICE_SERVER_UPDATE, data);
        break;
      }

      case 'TYPING_START': {
        this.emit(Events.TYPING_START, data);
        break;
      }

      case 'PRESENCE_UPDATE': {
        this.emit(Events.PRESENCE_UPDATE, data);
        break;
      }

      default:

        this.emit(Events.DEBUG, `Unhandled dispatch: ${eventName}`);
    }
  }

  _handleReady(data) {
    this.user = new User(this, data.user);
    this.users.set(this.user.id, this.user);
    this.ready = true;
    this.readyAt = new Date();

    this.logger.info(this.i18n.t('ready', { botName: this.user.tag }));

    this.plugins._notifyReady();

    this.emit(Events.READY, this);
  }

  _handleGuildCreate(data) {
    let guild = this.guilds.get(data.id);
    if (guild) {
      guild._patch(data);
    } else {
      guild = new Guild(this, data);
      this.guilds.set(guild.id, guild);
    }

    this.emit(Events.GUILD_CREATE, guild);
  }

  _resolveIntents(intents) {
    if (!intents) return Intents.DEFAULT.bitfield;
    if (intents instanceof Intents) return intents.bitfield;
    if (typeof intents === 'bigint') return intents;
    if (typeof intents === 'number') return BigInt(intents);
    if (Array.isArray(intents)) {
      return intents.reduce((acc, intent) => {
        if (typeof intent === 'bigint') return acc | intent;
        if (typeof intent === 'number') return acc | BigInt(intent);
        if (typeof intent === 'string' && Intents.FLAGS[intent]) {
          return acc | Intents.FLAGS[intent];
        }
        return acc;
      }, 0n);
    }
    return Intents.DEFAULT.bitfield;
  }

  async login(token) {
    if (!token) {
      throw new LumisError(ErrorCodes.INVALID_TOKEN);
    }

    if (this.ready) {
      throw new LumisError(ErrorCodes.CLIENT_ALREADY_LOGGED_IN);
    }

    this.token = token;
    this.rest.setToken(token);

    this.logger.info('Giriş yapılıyor...');

    await this.ws.connect(token, this.intents);
  }

  async destroy() {
    this.logger.info('Client yok ediliyor...');

    this.plugins.unloadAll();

    this.ws.destroy();

    this.rest.destroy();

    await this.cache.destroy();

    this.guilds.clear();
    this.channels.clear();
    this.users.clear();

    this.ready = false;
    this.user = null;
    this.token = null;
    this.readyAt = null;

    this.logger.success('Client başarıyla yok edildi.');
    this.emit(Events.DISCONNECT, 'Client destroyed');
    this.removeAllListeners();
  }

  static async gracefulShutdown(client) {
    const logger = client?.logger || new Logger();
    logger.warn('Kapatma sinyali alındı, temizleniyor...');
    
    try {
      if (client) await client.destroy();
      logger.success('Güvenli bir şekilde kapatıldı.');
      process.exit(0);
    } catch (error) {
      logger.error('Kapatma sırasında hata oluştu:', error);
      process.exit(1);
    }
  }

  setPresence(presence) {
    this.ws.setPresence(presence);
  }

  setActivity(name, type = 0) {
    this.setPresence({
      activities: [{ name, type }],
      status: 'online',
    });
  }

  get ping() {
    return this.ws.ping;
  }

  get uptime() {
    if (!this.readyAt) return null;
    return Date.now() - this.readyAt.getTime();
  }

  t(key, replacements) {
    return this.i18n.t(key, replacements);
  }
}

module.exports = Client;
