'use strict';

const { Endpoints } = require('../utils/Constants');
const User = require('./User');

class Message {
  
  constructor(client, data, channel = null) {
    this.client = client;
    this.id = data.id;
    this.channel = channel;

    this._patch(data);
  }

  _patch(data) {
    
    this.content = data.content ?? this.content ?? '';

    if (data.author) {
      this.author = new User(this.client, data.author);
    }

    this.channelId = data.channel_id ?? this.channel?.id ?? this.channelId ?? null;

    this.guildId = data.guild_id ?? this.guildId ?? null;

    this.embeds = data.embeds ?? this.embeds ?? [];

    this.attachments = data.attachments ?? this.attachments ?? [];

    this.mentions = data.mentions ?? this.mentions ?? [];

    this.type = data.type ?? this.type ?? 0;

    this.pinned = data.pinned ?? this.pinned ?? false;

    this.tts = data.tts ?? this.tts ?? false;

    if (data.timestamp) {
      this.createdAt = new Date(data.timestamp);
    }

    this.editedAt = data.edited_timestamp ? new Date(data.edited_timestamp) : this.editedAt ?? null;

    this.components = data.components ?? this.components ?? [];

    this.messageReference = data.message_reference ?? this.messageReference ?? null;

    if (data.referenced_message) {
      this.referencedMessage = new Message(this.client, data.referenced_message, this.channel);
    }

    this.stickers = data.sticker_items ?? this.stickers ?? [];
  }

  get guild() {
    if (!this.guildId) return null;
    return this.client.guilds.get(this.guildId) || null;
  }

  get member() {
    if (!this.guild || !this.author) return null;
    return this.guild.members.get(this.author.id) || null;
  }

  async reply(content) {
    const body = typeof content === 'string' ? { content } : { ...content };
    body.message_reference = { message_id: this.id };
    
    const data = await this.client.rest.post(
      Endpoints.CHANNEL_MESSAGES(this.channelId),
      { body }
    );
    return new Message(this.client, data, this.channel);
  }

  async edit(content) {
    const body = typeof content === 'string' ? { content } : content;
    const data = await this.client.rest.patch(
      Endpoints.CHANNEL_MESSAGE(this.channelId, this.id),
      { body }
    );
    this._patch(data);
    return this;
  }

  async delete(reason) {
    await this.client.rest.delete(
      Endpoints.CHANNEL_MESSAGE(this.channelId, this.id),
      { reason }
    );
  }

  async react(emoji) {

    const reaction = emoji.startsWith('<') 
      ? emoji.replace(/<a?:(\w+):(\d+)>/, '$1:$2')
      : encodeURIComponent(emoji);

    await this.client.rest.put(
      `${Endpoints.CHANNEL_REACTION(this.channelId, this.id, reaction)}/@me`
    );
  }

  async pin() {
    await this.client.rest.put(`/channels/${this.channelId}/pins/${this.id}`);
    this.pinned = true;
  }

  async unpin() {
    await this.client.rest.delete(`/channels/${this.channelId}/pins/${this.id}`);
    this.pinned = false;
  }

  get createdTimestamp() {
    return Number(BigInt(this.id) >> 22n) + 1420070400000;
  }

  toString() {
    return this.content;
  }

  awaitMessageComponent(options = {}) {
    return new Promise((resolve, reject) => {
      const InteractionCollector = require('../utils/InteractionCollector');
      const filter = options.filter || (() => true);
      
      const collector = new InteractionCollector(this.client, filter, {
        messageId: this.id,
        channelId: this.channelId,
        interactionType: 3, // MESSAGE_COMPONENT
        time: options.time || 15000,
        max: 1
      });

      collector.once('end', (collected, reason) => {
        if (collected.size === 0) {
          reject(new Error(`A timeout occurred while waiting for interaction. Reason: ${reason}`));
        } else {
          resolve(collected.first());
        }
      });
    });
  }

  toJSON() {
    return {
      id: this.id,
      content: this.content,
      author: this.author?.toJSON(),
      channelId: this.channelId,
      guildId: this.guildId,
      embeds: this.embeds,
    };
  }
}

module.exports = Message;
