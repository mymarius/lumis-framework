'use strict';

class Command {
  
  constructor(options) {
    this.name = options.name;
    this.description = options.description || '';
    this.type = options.type || 1;
    this.options = options.options || [];
    this.dmPermission = options.dmPermission !== undefined ? options.dmPermission : true;
    this.defaultMemberPermissions = options.defaultMemberPermissions || null;
    this.aliases = options.aliases ? (Array.isArray(options.aliases) ? options.aliases : [options.aliases]) : [];

    this.cooldown = options.cooldown || 0;

    if (!this.name) throw new Error('Command must have a "name" property.');
  }

  async execute(ctx, args) {
    throw new Error(`Execute metodu '${this.name}' komutunda tanımlanmamış.`);
  }

  async autocomplete(interaction) {

  }

  toJSON() {
    const payload = {
      name: this.name,
      type: this.type,
      options: this.options,
    };

    if (this.type === 1) payload.description = this.description;

    if (this.dmPermission === false) payload.dm_permission = false;

    if (this.defaultMemberPermissions) {
      payload.default_member_permissions = String(this.defaultMemberPermissions);
    }

    return payload;
  }
}

module.exports = Command;
