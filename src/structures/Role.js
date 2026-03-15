'use strict';

const BitField = require('../utils/BitField');
const { PermissionFlags } = require('../utils/Constants');

class Role {
  
  constructor(client, guild, data) {
    this.client = client;
    this.guild = guild;
    this.id = data.id;
    this._patch(data);
  }

  _patch(data) {
    this.name = data.name ?? this.name ?? null;
    this.color = data.color ?? this.color ?? 0;
    this.hoist = data.hoist ?? this.hoist ?? false;
    this.icon = data.icon ?? this.icon ?? null;
    this.unicodeEmoji = data.unicode_emoji ?? this.unicodeEmoji ?? null;
    this.position = data.position ?? this.position ?? 0;
    this.managed = data.managed ?? this.managed ?? false;
    this.mentionable = data.mentionable ?? this.mentionable ?? false;

    this.permissionsBitfield = data.permissions !== undefined
      ? BigInt(data.permissions)
      : this.permissionsBitfield ?? 0n;
  }

  get hexColor() {
    return `#${this.color.toString(16).padStart(6, '0')}`;
  }

  get isEveryone() {
    return this.id === this.guild.id;
  }

  get members() {
    return this.guild.members.filter((member) =>
      member.roleIds.includes(this.id) || this.isEveryone
    );
  }

  hasPermission(permission) {

    if ((this.permissionsBitfield & PermissionFlags.ADMINISTRATOR) !== 0n) return true;

    const flag = PermissionFlags[permission];
    if (!flag) return false;
    return (this.permissionsBitfield & flag) !== 0n;
  }

  async edit(data, reason) {
    const updated = await this.client.rest.patch(
      `/guilds/${this.guild.id}/roles/${this.id}`,
      { body: data, reason }
    );
    this._patch(updated);
    return this;
  }

  async delete(reason) {
    await this.client.rest.delete(
      `/guilds/${this.guild.id}/roles/${this.id}`,
      { reason }
    );
  }

  toString() {
    if (this.isEveryone) return '@everyone';
    return `<@&${this.id}>`;
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      color: this.color,
      position: this.position,
      permissions: this.permissionsBitfield.toString(),
    };
  }
}

module.exports = Role;
