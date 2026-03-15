'use strict';

const { CDN_URL, Endpoints } = require('../utils/Constants');
const Collection = require('../utils/Collection');

class Guild {
  
  constructor(client, data) {
    this.client = client;
    this.id = data.id;

    this.members = new Collection();

    this.channels = new Collection();

    this.roles = new Collection();

    this._patch(data);
  }

  _patch(data) {
    this.name = data.name ?? this.name ?? null;
    this.icon = data.icon ?? this.icon ?? null;
    this.splash = data.splash ?? this.splash ?? null;
    this.banner = data.banner ?? this.banner ?? null;
    this.ownerId = data.owner_id ?? this.ownerId ?? null;
    this.memberCount = data.member_count ?? this.memberCount ?? 0;
    this.large = data.large ?? this.large ?? false;
    this.description = data.description ?? this.description ?? null;
    this.vanityURLCode = data.vanity_url_code ?? this.vanityURLCode ?? null;
    this.premiumTier = data.premium_tier ?? this.premiumTier ?? 0;
    this.premiumSubscriptionCount = data.premium_subscription_count ?? this.premiumSubscriptionCount ?? 0;
    this.preferredLocale = data.preferred_locale ?? this.preferredLocale ?? 'en-US';
    this.maxMembers = data.max_members ?? this.maxMembers ?? 0;
    this.verificationLevel = data.verification_level ?? this.verificationLevel ?? 0;
    this.nsfwLevel = data.nsfw_level ?? this.nsfwLevel ?? 0;

    if (data.roles) {
      const Role = require('./Role');
      for (const roleData of data.roles) {
        this.roles.set(roleData.id, new Role(this.client, this, roleData));
      }
    }

    if (data.channels) {
      const { Channel } = require('./Channel');
      for (const channelData of data.channels) {
        const channel = Channel.create(this.client, channelData, this);
        this.channels.set(channel.id, channel);

        this.client.channels.set(channel.id, channel);
      }
    }

    if (data.members) {
      const Member = require('./Member');
      for (const memberData of data.members) {
        const member = new Member(this.client, this, memberData);
        this.members.set(member.user.id, member);
      }
    }
  }

  get owner() {
    return this.members.get(this.ownerId) || null;
  }

  iconURL(options = {}) {
    if (!this.icon) return null;
    const format = this.icon.startsWith('a_') ? 'gif' : (options.format || 'webp');
    const size = options.size || 128;
    return `${CDN_URL}/icons/${this.id}/${this.icon}.${format}?size=${size}`;
  }

  bannerURL(options = {}) {
    if (!this.banner) return null;
    const format = options.format || 'webp';
    const size = options.size || 512;
    return `${CDN_URL}/banners/${this.id}/${this.banner}.${format}?size=${size}`;
  }

  async fetchMembers(options = {}) {
    const query = {};
    if (options.limit) query.limit = options.limit;
    if (options.after) query.after = options.after;

    const data = await this.client.rest.get(Endpoints.GUILD_MEMBERS(this.id), { query });
    const Member = require('./Member');

    for (const memberData of data) {
      const member = new Member(this.client, this, memberData);
      this.members.set(member.user.id, member);
    }

    return this.members;
  }

  async leave() {
    await this.client.rest.delete(`/users/@me/guilds/${this.id}`);
  }

  async edit(data, reason) {
    const updated = await this.client.rest.patch(Endpoints.GUILD(this.id), {
      body: data,
      reason,
    });
    this._patch(updated);
    return this;
  }

  toString() {
    return this.name;
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      icon: this.icon,
      memberCount: this.memberCount,
      ownerId: this.ownerId,
    };
  }
}

module.exports = Guild;
