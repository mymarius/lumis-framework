'use strict';

const { CDN_URL } = require('../utils/Constants');

class User {
  
  constructor(client, data) {
    this.client = client;

    this.id = data.id;

    this._patch(data);
  }

  _patch(data) {
    
    this.username = data.username ?? this.username ?? null;

    this.globalName = data.global_name ?? this.globalName ?? null;

    this.discriminator = data.discriminator ?? this.discriminator ?? '0';

    this.avatar = data.avatar ?? this.avatar ?? null;

    this.bot = data.bot ?? this.bot ?? false;

    this.system = data.system ?? this.system ?? false;

    this.banner = data.banner ?? this.banner ?? null;

    this.accentColor = data.accent_color ?? this.accentColor ?? null;
  }

  get displayName() {
    return this.globalName || this.username;
  }

  get tag() {
    if (this.discriminator === '0') return this.username;
    return `${this.username}#${this.discriminator}`;
  }

  avatarURL(options = {}) {
    if (!this.avatar) return this.defaultAvatarURL;

    const format = this.avatar.startsWith('a_') ? 'gif' : (options.format || 'webp');
    const size = options.size || 128;
    return `${CDN_URL}/avatars/${this.id}/${this.avatar}.${format}?size=${size}`;
  }

  get defaultAvatarURL() {
    const index = this.discriminator === '0'
      ? Number(BigInt(this.id) >> 22n) % 6
      : parseInt(this.discriminator) % 5;
    return `${CDN_URL}/embed/avatars/${index}.png`;
  }

  bannerURL(options = {}) {
    if (!this.banner) return null;

    const format = this.banner.startsWith('a_') ? 'gif' : (options.format || 'webp');
    const size = options.size || 512;
    return `${CDN_URL}/banners/${this.id}/${this.banner}.${format}?size=${size}`;
  }

  async send(content) {
    const dm = await this.client.rest.post('/users/@me/channels', {
      body: { recipient_id: this.id },
    });

    const messageData = typeof content === 'string' ? { content } : content;
    return this.client.rest.post(`/channels/${dm.id}/messages`, {
      body: messageData,
    });
  }

  toString() {
    return `<@${this.id}>`;
  }

  toJSON() {
    return {
      id: this.id,
      username: this.username,
      globalName: this.globalName,
      discriminator: this.discriminator,
      avatar: this.avatar,
      bot: this.bot,
    };
  }
}

module.exports = User;
