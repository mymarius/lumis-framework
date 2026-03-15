'use strict';

const User = require('./User');
const { Endpoints } = require('../utils/Constants');

class Member {
  
  constructor(client, guild, data) {
    this.client = client;
    this.guild = guild;

    this._patch(data);
  }

  _patch(data) {
    
    if (data.user) {
      this.user = new User(this.client, data.user);
    }

    this.nickname = data.nick ?? this.nickname ?? null;

    this.avatar = data.avatar ?? this.avatar ?? null;

    this.roleIds = data.roles ?? this.roleIds ?? [];

    this.joinedAt = data.joined_at ? new Date(data.joined_at) : this.joinedAt ?? null;

    this.premiumSince = data.premium_since ? new Date(data.premium_since) : this.premiumSince ?? null;

    this.communicationDisabledUntil = data.communication_disabled_until
      ? new Date(data.communication_disabled_until)
      : this.communicationDisabledUntil ?? null;

    this.deaf = data.deaf ?? this.deaf ?? false;

    this.mute = data.mute ?? this.mute ?? false;

    this.pending = data.pending ?? this.pending ?? false;
  }

  get id() {
    return this.user.id;
  }

  get displayName() {
    return this.nickname || this.user.displayName;
  }

  get roles() {
    return this.guild.roles.filter((role) => this.roleIds.includes(role.id) || role.id === this.guild.id);
  }

  get highestRole() {
    const memberRoles = this.roles;
    if (memberRoles.size === 0) return null;
    return memberRoles.sort((a, b) => b.position - a.position).first();
  }

  async kick(reason) {
    await this.client.rest.delete(
      Endpoints.GUILD_MEMBER(this.guild.id, this.user.id),
      { reason }
    );
  }

  async ban(options = {}) {
    await this.client.rest.put(
      Endpoints.GUILD_BAN(this.guild.id, this.user.id),
      {
        body: {
          delete_message_seconds: options.deleteMessageSeconds || 0,
        },
        reason: options.reason,
      }
    );
  }

  async addRole(roleId, reason) {
    await this.client.rest.put(
      `/guilds/${this.guild.id}/members/${this.user.id}/roles/${roleId}`,
      { reason }
    );
    if (!this.roleIds.includes(roleId)) {
      this.roleIds.push(roleId);
    }
  }

  async removeRole(roleId, reason) {
    await this.client.rest.delete(
      `/guilds/${this.guild.id}/members/${this.user.id}/roles/${roleId}`,
      { reason }
    );
    this.roleIds = this.roleIds.filter((id) => id !== roleId);
  }

  async edit(data, reason) {
    const body = {};
    if (data.nickname !== undefined) body.nick = data.nickname;
    if (data.roles !== undefined) body.roles = data.roles;
    if (data.mute !== undefined) body.mute = data.mute;
    if (data.deaf !== undefined) body.deaf = data.deaf;
    if (data.communicationDisabledUntil !== undefined) {
      body.communication_disabled_until = data.communicationDisabledUntil
        ? data.communicationDisabledUntil.toISOString()
        : null;
    }

    const updated = await this.client.rest.patch(
      Endpoints.GUILD_MEMBER(this.guild.id, this.user.id),
      { body, reason }
    );
    this._patch(updated);
    return this;
  }

  async timeout(duration, reason) {
    const until = duration ? new Date(Date.now() + duration) : null;
    return this.edit({ communicationDisabledUntil: until }, reason);
  }

  toString() {
    return `<@${this.nickname ? '!' : ''}${this.user.id}>`;
  }

  toJSON() {
    return {
      userId: this.user.id,
      guildId: this.guild.id,
      nickname: this.nickname,
      roles: this.roleIds,
      joinedAt: this.joinedAt,
    };
  }
}

module.exports = Member;
