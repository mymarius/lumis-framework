'use strict';

const BitField = require('./BitField');

class Intents extends BitField {
  
  static get DEFAULT() {
    return new Intents([
      this.FLAGS.GUILDS,
      this.FLAGS.GUILD_MEMBERS,
      this.FLAGS.GUILD_MODERATION,
      this.FLAGS.GUILD_EMOJIS_AND_STICKERS,
      this.FLAGS.GUILD_INTEGRATIONS,
      this.FLAGS.GUILD_WEBHOOKS,
      this.FLAGS.GUILD_INVITES,
      this.FLAGS.GUILD_VOICE_STATES,
      this.FLAGS.GUILD_MESSAGES,
      this.FLAGS.GUILD_MESSAGE_REACTIONS,
      this.FLAGS.GUILD_MESSAGE_TYPING,
      this.FLAGS.DIRECT_MESSAGES,
      this.FLAGS.DIRECT_MESSAGE_REACTIONS,
      this.FLAGS.DIRECT_MESSAGE_TYPING,
      this.FLAGS.GUILD_SCHEDULED_EVENTS,
    ]);
  }

  static get ALL() {
    return new Intents(Object.values(this.FLAGS).reduce((acc, val) => acc | val, 0n));
  }
}

Intents.FLAGS = {
  GUILDS: 1n << 0n,
  GUILD_MEMBERS: 1n << 1n,
  GUILD_MODERATION: 1n << 2n,
  GUILD_EMOJIS_AND_STICKERS: 1n << 3n,
  GUILD_INTEGRATIONS: 1n << 4n,
  GUILD_WEBHOOKS: 1n << 5n,
  GUILD_INVITES: 1n << 6n,
  GUILD_VOICE_STATES: 1n << 7n,
  GUILD_PRESENCES: 1n << 8n,
  GUILD_MESSAGES: 1n << 9n,
  GUILD_MESSAGE_REACTIONS: 1n << 10n,
  GUILD_MESSAGE_TYPING: 1n << 11n,
  DIRECT_MESSAGES: 1n << 12n,
  DIRECT_MESSAGE_REACTIONS: 1n << 13n,
  DIRECT_MESSAGE_TYPING: 1n << 14n,
  MESSAGE_CONTENT: 1n << 15n,
  GUILD_SCHEDULED_EVENTS: 1n << 16n,
  AUTO_MODERATION_CONFIGURATION: 1n << 20n,
  AUTO_MODERATION_EXECUTION: 1n << 21n,
};

module.exports = Intents;
