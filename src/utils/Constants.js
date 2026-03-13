'use strict';

const API_VERSION = 10;
const API_BASE_URL = `https://discord.com/api/v${API_VERSION}`;
const GATEWAY_URL = `wss://gateway.discord.gg/?v=${API_VERSION}&encoding=json`;
const CDN_URL = 'https://cdn.discordapp.com';

const GatewayOpcodes = {
  DISPATCH: 0,
  HEARTBEAT: 1,
  IDENTIFY: 2,
  PRESENCE_UPDATE: 3,
  VOICE_STATE_UPDATE: 4,
  RESUME: 6,
  RECONNECT: 7,
  REQUEST_GUILD_MEMBERS: 8,
  INVALID_SESSION: 9,
  HELLO: 10,
  HEARTBEAT_ACK: 11,
};

const GatewayCloseCodes = {
  UNKNOWN_ERROR: 4000,
  UNKNOWN_OPCODE: 4001,
  DECODE_ERROR: 4002,
  NOT_AUTHENTICATED: 4003,
  AUTHENTICATION_FAILED: 4004,
  ALREADY_AUTHENTICATED: 4005,
  INVALID_SEQ: 4007,
  RATE_LIMITED: 4008,
  SESSION_TIMED_OUT: 4009,
  INVALID_SHARD: 4010,
  SHARDING_REQUIRED: 4011,
  INVALID_API_VERSION: 4012,
  INVALID_INTENTS: 4013,
  DISALLOWED_INTENTS: 4014,
};

const RESUMABLE_CLOSE_CODES = new Set([
  GatewayCloseCodes.UNKNOWN_ERROR,
  GatewayCloseCodes.UNKNOWN_OPCODE,
  GatewayCloseCodes.DECODE_ERROR,
  GatewayCloseCodes.NOT_AUTHENTICATED,
  GatewayCloseCodes.ALREADY_AUTHENTICATED,
  GatewayCloseCodes.INVALID_SEQ,
  GatewayCloseCodes.RATE_LIMITED,
  GatewayCloseCodes.SESSION_TIMED_OUT,
]);

const NON_RECOVERABLE_CLOSE_CODES = new Set([
  GatewayCloseCodes.AUTHENTICATION_FAILED,
  GatewayCloseCodes.INVALID_SHARD,
  GatewayCloseCodes.SHARDING_REQUIRED,
  GatewayCloseCodes.INVALID_API_VERSION,
  GatewayCloseCodes.INVALID_INTENTS,
  GatewayCloseCodes.DISALLOWED_INTENTS,
]);

const ChannelTypes = {
  GUILD_TEXT: 0,
  DM: 1,
  GUILD_VOICE: 2,
  GROUP_DM: 3,
  GUILD_CATEGORY: 4,
  GUILD_ANNOUNCEMENT: 5,
  ANNOUNCEMENT_THREAD: 10,
  PUBLIC_THREAD: 11,
  PRIVATE_THREAD: 12,
  GUILD_STAGE_VOICE: 13,
  GUILD_DIRECTORY: 14,
  GUILD_FORUM: 15,
  GUILD_MEDIA: 16,
};

const Events = {

  READY: 'ready',
  ERROR: 'error',
  WARN: 'warn',
  DEBUG: 'debug',
  RECONNECTING: 'reconnecting',
  DISCONNECT: 'disconnect',

  GUILD_CREATE: 'guildCreate',
  GUILD_UPDATE: 'guildUpdate',
  GUILD_DELETE: 'guildDelete',
  GUILD_MEMBER_ADD: 'guildMemberAdd',
  GUILD_MEMBER_UPDATE: 'guildMemberUpdate',
  GUILD_MEMBER_REMOVE: 'guildMemberRemove',
  GUILD_BAN_ADD: 'guildBanAdd',
  GUILD_BAN_REMOVE: 'guildBanRemove',
  GUILD_ROLE_CREATE: 'guildRoleCreate',
  GUILD_ROLE_UPDATE: 'guildRoleUpdate',
  GUILD_ROLE_DELETE: 'guildRoleDelete',

  CHANNEL_CREATE: 'channelCreate',
  CHANNEL_UPDATE: 'channelUpdate',
  CHANNEL_DELETE: 'channelDelete',

  MESSAGE_CREATE: 'messageCreate',
  MESSAGE_UPDATE: 'messageUpdate',
  MESSAGE_DELETE: 'messageDelete',
  MESSAGE_BULK_DELETE: 'messageBulkDelete',
  MESSAGE_REACTION_ADD: 'messageReactionAdd',
  MESSAGE_REACTION_REMOVE: 'messageReactionRemove',

  INTERACTION_CREATE: 'interactionCreate',

  VOICE_STATE_UPDATE: 'voiceStateUpdate',
  VOICE_SERVER_UPDATE: 'voiceServerUpdate',

  PRESENCE_UPDATE: 'presenceUpdate',
  TYPING_START: 'typingStart',
};

const Endpoints = {

  CHANNEL: (id) => `/channels/${id}`,
  CHANNEL_MESSAGES: (id) => `/channels/${id}/messages`,
  CHANNEL_MESSAGE: (channelId, messageId) => `/channels/${channelId}/messages/${messageId}`,
  CHANNEL_BULK_DELETE: (id) => `/channels/${id}/messages/bulk-delete`,
  CHANNEL_PINS: (id) => `/channels/${id}/pins`,
  CHANNEL_TYPING: (id) => `/channels/${id}/typing`,
  CHANNEL_REACTION: (channelId, messageId, emoji) =>
    `/channels/${channelId}/messages/${messageId}/reactions/${encodeURIComponent(emoji)}`,

  GUILD: (id) => `/guilds/${id}`,
  GUILD_CHANNELS: (id) => `/guilds/${id}/channels`,
  GUILD_MEMBERS: (id) => `/guilds/${id}/members`,
  GUILD_MEMBER: (guildId, userId) => `/guilds/${guildId}/members/${userId}`,
  GUILD_BANS: (id) => `/guilds/${id}/bans`,
  GUILD_BAN: (guildId, userId) => `/guilds/${guildId}/bans/${userId}`,
  GUILD_ROLES: (id) => `/guilds/${id}/roles`,
  GUILD_ROLE: (guildId, roleId) => `/guilds/${guildId}/roles/${roleId}`,

  USER: (id) => `/users/${id}`,
  USER_ME: '/users/@me',
  USER_DM: '/users/@me/channels',
  
  APPLICATION_COMMANDS: (id) => `/applications/${id}/commands`,
  INTERACTION_CALLBACK: (id, token) => `/interactions/${id}/${token}/callback`,

  GATEWAY: '/gateway',
  GATEWAY_BOT: '/gateway/bot',
};

const PermissionFlags = {
  CREATE_INSTANT_INVITE: 1n << 0n,
  KICK_MEMBERS: 1n << 1n,
  BAN_MEMBERS: 1n << 2n,
  ADMINISTRATOR: 1n << 3n,
  MANAGE_CHANNELS: 1n << 4n,
  MANAGE_GUILD: 1n << 5n,
  ADD_REACTIONS: 1n << 6n,
  VIEW_AUDIT_LOG: 1n << 7n,
  PRIORITY_SPEAKER: 1n << 8n,
  STREAM: 1n << 9n,
  VIEW_CHANNEL: 1n << 10n,
  SEND_MESSAGES: 1n << 11n,
  SEND_TTS_MESSAGES: 1n << 12n,
  MANAGE_MESSAGES: 1n << 13n,
  EMBED_LINKS: 1n << 14n,
  ATTACH_FILES: 1n << 15n,
  READ_MESSAGE_HISTORY: 1n << 16n,
  MENTION_EVERYONE: 1n << 17n,
  USE_EXTERNAL_EMOJIS: 1n << 18n,
  VIEW_GUILD_INSIGHTS: 1n << 19n,
  CONNECT: 1n << 20n,
  SPEAK: 1n << 21n,
  MUTE_MEMBERS: 1n << 22n,
  DEAFEN_MEMBERS: 1n << 23n,
  MOVE_MEMBERS: 1n << 24n,
  USE_VAD: 1n << 25n,
  CHANGE_NICKNAME: 1n << 26n,
  MANAGE_NICKNAMES: 1n << 27n,
  MANAGE_ROLES: 1n << 28n,
  MANAGE_WEBHOOKS: 1n << 29n,
  MANAGE_EMOJIS_AND_STICKERS: 1n << 30n,
  USE_APPLICATION_COMMANDS: 1n << 31n,
  MANAGE_EVENTS: 1n << 33n,
  MANAGE_THREADS: 1n << 34n,
  CREATE_PUBLIC_THREADS: 1n << 35n,
  CREATE_PRIVATE_THREADS: 1n << 36n,
  USE_EXTERNAL_STICKERS: 1n << 37n,
  SEND_MESSAGES_IN_THREADS: 1n << 38n,
  MODERATE_MEMBERS: 1n << 40n,
};

const Colors = {
  DEFAULT: 0x000000,
  WHITE: 0xffffff,
  AQUA: 0x1abc9c,
  GREEN: 0x57f287,
  BLUE: 0x3498db,
  YELLOW: 0xfee75c,
  PURPLE: 0x9b59b6,
  LUMINOUS_VIVID_PINK: 0xe91e63,
  FUCHSIA: 0xeb459e,
  GOLD: 0xf1c40f,
  ORANGE: 0xe67e22,
  RED: 0xed4245,
  GREY: 0x95a5a6,
  NAVY: 0x34495e,
  DARK_AQUA: 0x11806a,
  DARK_GREEN: 0x1f8b4c,
  DARK_BLUE: 0x206694,
  DARK_PURPLE: 0x71368a,
  DARK_VIVID_PINK: 0xad1457,
  DARK_GOLD: 0xc27c0e,
  DARK_ORANGE: 0xa84300,
  DARK_RED: 0x992d22,
  DARK_GREY: 0x979c9f,
  DARKER_GREY: 0x7f8c8d,
  LIGHT_GREY: 0xbcc0c0,
  DARK_NAV: 0x2c3e50,
  BLURPLE: 0x5865f2,
  GREYPLE: 0x99aab5,
  DARK_BUT_NOT_BLACK: 0x2c2f33,
  NOT_QUITE_BLACK: 0x23272a,
};

module.exports = {
  API_VERSION,
  API_BASE_URL,
  GATEWAY_URL,
  CDN_URL,
  GatewayOpcodes,
  GatewayCloseCodes,
  RESUMABLE_CLOSE_CODES,
  NON_RECOVERABLE_CLOSE_CODES,
  ChannelTypes,
  Events,
  Endpoints,
  PermissionFlags,
  Colors,
};
