'use strict';

const Client = require('./src/client/Client');
const ShardingManager = require('./src/client/ShardingManager');

const User = require('./src/structures/User');
const Guild = require('./src/structures/Guild');
const { Channel, TextChannel, VoiceChannel, DMChannel, CategoryChannel } = require('./src/structures/Channel');
const Message = require('./src/structures/Message');
const Member = require('./src/structures/Member');
const Role = require('./src/structures/Role');
const Embed = require('./src/structures/Embed');

const Collection = require('./src/utils/Collection');
const BitField = require('./src/utils/BitField');
const Intents = require('./src/utils/Intents');
const Logger = require('./src/utils/Logger');
const Constants = require('./src/utils/Constants');

const CacheManager = require('./src/cache/CacheManager');
const MemoryAdapter = require('./src/cache/MemoryAdapter');

const Plugin = require('./src/plugins/Plugin');
const PluginManager = require('./src/plugins/PluginManager');

const Command = require('./src/interactions/Command');
const CommandManager = require('./src/interactions/CommandManager');
const InteractionHandler = require('./src/interactions/InteractionHandler');
const CooldownManager = require('./src/interactions/CooldownManager');
const { Interaction, CommandInteraction, MessageComponentInteraction, ModalSubmitInteraction } = require('./src/structures/Interaction');

const I18nManager = require('./src/i18n/I18nManager');

const EconomyManager = require('./src/game/EconomyManager');
const InventoryManager = require('./src/game/InventoryManager');
const LevelingSystem = require('./src/game/LevelingSystem');
const GameSessionManager = require('./src/game/GameSessionManager');
const GuildManager = require('./src/game/GuildManager');
const MusicManager = require('./src/game/MusicManager');

const { LumisError, APIError, WebSocketError, RateLimitError } = require('./src/errors/LumisError');
const { ErrorCodes, ErrorMessages } = require('./src/errors/ErrorCodes');

const RESTManager = require('./src/rest/RESTManager');
const RateLimiter = require('./src/rest/RateLimiter');
const APIRouter = require('./src/rest/APIRouter');

const WebSocketManager = require('./src/ws/WebSocketManager');

// ── Differentiation Modules ──
const MiddlewareManager = require('./src/middleware/MiddlewareManager');
const Guards = require('./src/guards/Guards');
const EventInterceptor = require('./src/interceptors/EventInterceptor');
const ServiceContainer = require('./src/di/ServiceContainer');
const HotReloadManager = require('./src/hotreload/HotReloadManager');
const DashboardManager = require('./src/dashboard/DashboardManager');
const { TestClient, TestResult } = require('./src/testing/TestClient');

module.exports = {

  // Core
  Client,
  ShardingManager,

  // Structures
  User,
  Guild,
  Channel,
  TextChannel,
  VoiceChannel,
  DMChannel,
  CategoryChannel,
  Message,
  Member,
  Role,
  Embed,

  // Utils
  Collection,
  BitField,
  Intents,
  Logger,
  Constants,

  // Cache
  CacheManager,
  MemoryAdapter,

  // Plugins
  Plugin,
  PluginManager,

  // Commands & Interactions
  Command,
  CommandManager,
  InteractionHandler,
  CooldownManager,
  Interaction,
  CommandInteraction,
  MessageComponentInteraction,
  ModalSubmitInteraction,

  // i18n
  I18nManager,

  // Game & Economy
  EconomyManager,
  InventoryManager,
  LevelingSystem,
  GameSessionManager,
  GuildManager,
  MusicManager,

  // Errors
  LumisError,
  APIError,
  WebSocketError,
  RateLimitError,
  ErrorCodes,
  ErrorMessages,

  // REST & WebSocket
  RESTManager,
  RateLimiter,
  APIRouter,
  WebSocketManager,

  // ── Differentiation Features ──
  MiddlewareManager,
  Guards,
  EventInterceptor,
  ServiceContainer,
  HotReloadManager,
  DashboardManager,
  TestClient,
  TestResult,

  // Constants shorthand
  Colors: Constants.Colors,
  Events: Constants.Events,
  ChannelTypes: Constants.ChannelTypes,
  PermissionFlags: Constants.PermissionFlags,
  GatewayOpcodes: Constants.GatewayOpcodes,

  version: '1.2.0',
};
