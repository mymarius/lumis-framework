'use strict';

const { ChannelTypes, Endpoints } = require('../utils/Constants');
const Collection = require('../utils/Collection');

class Channel {
  constructor(client, data, guild = null) {
    this.client = client;
    this.id = data.id;
    this.guild = guild;
    this._patch(data);
  }

  _patch(data) {
    this.type = data.type ?? this.type ?? 0;
    this.name = data.name ?? this.name ?? null;
    this.position = data.position ?? this.position ?? 0;
    this.parentId = data.parent_id ?? this.parentId ?? null;
    this.nsfw = data.nsfw ?? this.nsfw ?? false;
  }

  static create(client, data, guild = null) {
    switch (data.type) {
      case ChannelTypes.GUILD_TEXT:
      case ChannelTypes.GUILD_ANNOUNCEMENT:
      case ChannelTypes.GUILD_FORUM:
        return new TextChannel(client, data, guild);
      case ChannelTypes.GUILD_VOICE:
      case ChannelTypes.GUILD_STAGE_VOICE:
        return new VoiceChannel(client, data, guild);
      case ChannelTypes.DM:
      case ChannelTypes.GROUP_DM:
        return new DMChannel(client, data);
      case ChannelTypes.GUILD_CATEGORY:
        return new CategoryChannel(client, data, guild);
      default:
        return new Channel(client, data, guild);
    }
  }

  async delete(reason) {
    await this.client.rest.delete(Endpoints.CHANNEL(this.id), { reason });
  }

  async edit(data, reason) {
    const updated = await this.client.rest.patch(Endpoints.CHANNEL(this.id), {
      body: data,
      reason,
    });
    this._patch(updated);
    return this;
  }

  get isText() {
    return [
      ChannelTypes.GUILD_TEXT,
      ChannelTypes.DM,
      ChannelTypes.GROUP_DM,
      ChannelTypes.GUILD_ANNOUNCEMENT,
      ChannelTypes.PUBLIC_THREAD,
      ChannelTypes.PRIVATE_THREAD,
      ChannelTypes.ANNOUNCEMENT_THREAD,
    ].includes(this.type);
  }

  get isVoice() {
    return [ChannelTypes.GUILD_VOICE, ChannelTypes.GUILD_STAGE_VOICE].includes(this.type);
  }

  toString() {
    return `<#${this.id}>`;
  }

  toJSON() {
    return {
      id: this.id,
      type: this.type,
      name: this.name,
      guildId: this.guild?.id || null,
    };
  }
}

class TextChannel extends Channel {
  _patch(data) {
    super._patch(data);
    this.topic = data.topic ?? this.topic ?? null;
    this.rateLimitPerUser = data.rate_limit_per_user ?? this.rateLimitPerUser ?? 0;
    this.lastMessageId = data.last_message_id ?? this.lastMessageId ?? null;

    if (!this.messages) this.messages = new Collection();
  }

  async send(content) {
    const body = typeof content === 'string' ? { content } : content;
    const data = await this.client.rest.post(Endpoints.CHANNEL_MESSAGES(this.id), { body });
    const Message = require('./Message');
    const message = new Message(this.client, data, this);
    this.messages.set(message.id, message);
    return message;
  }

  async fetchMessages(options = {}) {
    const query = {};
    if (options.limit) query.limit = Math.min(options.limit, 100);
    if (options.before) query.before = options.before;
    if (options.after) query.after = options.after;
    if (options.around) query.around = options.around;

    const data = await this.client.rest.get(Endpoints.CHANNEL_MESSAGES(this.id), { query });
    const Message = require('./Message');
    const messages = new Collection();

    for (const msgData of data) {
      const message = new Message(this.client, msgData, this);
      messages.set(message.id, message);
      this.messages.set(message.id, message);
    }

    return messages;
  }

  async bulkDelete(messages) {
    let messageIds;
    if (Array.isArray(messages)) {
      messageIds = messages;
    } else {
      const fetched = await this.fetchMessages({ limit: messages });
      messageIds = fetched.map((m) => m.id);
    }

    if (messageIds.length < 2) {

      if (messageIds.length === 1) {
        await this.client.rest.delete(Endpoints.CHANNEL_MESSAGE(this.id, messageIds[0]));
      }
      return;
    }

    const twoWeeksAgo = Date.now() - 14 * 24 * 60 * 60 * 1000;
    const filteredIds = messageIds.filter((id) => {
      const timestamp = Number(BigInt(id) >> 22n) + 1420070400000;
      return timestamp > twoWeeksAgo;
    });

    if (filteredIds.length >= 2) {
      await this.client.rest.post(Endpoints.CHANNEL_BULK_DELETE(this.id), {
        body: { messages: filteredIds },
      });
    }
  }

  awaitMessages(options = {}) {
    return new Promise((resolve, reject) => {
      const MessageCollector = require('../utils/MessageCollector');
      const filter = options.filter || (() => true);

      const collector = new MessageCollector(this, filter, {
        time: options.time || 15000,
        max: options.max || 1
      });

      collector.once('end', (collected, reason) => {
        if (options.errors && options.errors.includes('time') && collected.size < (options.max || 1)) {
          reject(new Error(`Timeout. The number of messages collected is below the limit. (${collected.size})`));
        } else {
          resolve(collected);
        }
      });
    });
  }

  async sendTyping() {
    await this.client.rest.post(Endpoints.CHANNEL_TYPING(this.id));
  }
}

class VoiceChannel extends Channel {
  _patch(data) {
    super._patch(data);
    this.bitrate = data.bitrate ?? this.bitrate ?? 64000;
    this.userLimit = data.user_limit ?? this.userLimit ?? 0;
    this.rtcRegion = data.rtc_region ?? this.rtcRegion ?? null;
  }
}

class DMChannel extends Channel {
  _patch(data) {
    super._patch(data);
    this.lastMessageId = data.last_message_id ?? this.lastMessageId ?? null;

    if (data.recipients && data.recipients.length > 0) {
      const User = require('./User');
      this.recipient = new User(this.client, data.recipients[0]);
    }

    if (!this.messages) this.messages = new Collection();
  }

  async send(content) {
    const body = typeof content === 'string' ? { content } : content;
    const data = await this.client.rest.post(Endpoints.CHANNEL_MESSAGES(this.id), { body });
    const Message = require('./Message');
    return new Message(this.client, data, this);
  }
}

class CategoryChannel extends Channel {
  
  get children() {
    if (!this.guild) return new Collection();
    return this.guild.channels.filter((c) => c.parentId === this.id);
  }
}

module.exports = { Channel, TextChannel, VoiceChannel, DMChannel, CategoryChannel };
