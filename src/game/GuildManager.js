'use strict';

const { Collection } = require('../utils/Collection');
const { LumisError } = require('../errors/LumisError');
const { ErrorCodes } = require('../errors/ErrorCodes');

class GuildManager {
  
  constructor(client) {
    this.client = client;
  }

  _nameHistoryKey(userId, guildId) {
    return `name_history_${guildId}_${userId}`;
  }

  async registerUser(member, name, age, options = {}) {
    if (!member || !member.id || !member.guildId) {
      throw new LumisError(ErrorCodes.INVALID_ARGUMENT, 'Invalid member object.');
    }

    const nameFormat = options.nameFormat || '{name} | {age}';
    let formattedName = nameFormat.replace('{name}', name).replace('{age}', age);

    try {

      await this.client.rest.patch(`/guilds/${member.guildId}/members/${member.id}`, {
        body: { nick: formattedName }
      });

      if (options.rolesToAdd && Array.isArray(options.rolesToAdd)) {
        for (const roleId of options.rolesToAdd) {
          await this.client.rest.put(`/guilds/${member.guildId}/members/${member.id}/roles/${roleId}`);
        }
      }

      if (options.rolesToRemove && Array.isArray(options.rolesToRemove)) {
        for (const roleId of options.rolesToRemove) {
          await this.client.rest.delete(`/guilds/${member.guildId}/members/${member.id}/roles/${roleId}`);
        }
      }

      await this.addNameHistory(member.id, member.guildId, formattedName, 'Register');

      return true;
    } catch (error) {
      this.client.logger.error(`Registration failed (User: ${member.id}):`, error);
      return false;
    }
  }

  async addNameHistory(userId, guildId, name, reason = "Name Change") {
    const key = this._nameHistoryKey(userId, guildId);
    
    let history = await this.client.cache.get(key);
    if (!history) history = '[]';
    
    const arr = JSON.parse(history);
    arr.push({
      name,
      reason,
      date: Date.now()
    });

    await this.client.cache.set(key, JSON.stringify(arr));
  }

  async getNameHistory(userId, guildId) {
    const key = this._nameHistoryKey(userId, guildId);
    const history = await this.client.cache.get(key);
    if (!history) return [];
    
    return JSON.parse(history).sort((a, b) => b.date - a.date);
  }

  async jailUser(member, jailRoleId) {
    if (!member || !member.id || !member.guildId) return false;

    const currentRoles = member.roles || [];
    const cacheKey = `jail_roles_${member.guildId}_${member.id}`;
    
    await this.client.cache.set(cacheKey, JSON.stringify(currentRoles));

    try {

      await this.client.rest.patch(`/guilds/${member.guildId}/members/${member.id}`, {
        body: { roles: [jailRoleId] }
      });
      return true;
    } catch (error) {
      this.client.logger.error('Jail failed:', error);
      return false;
    }
  }

  async unjailUser(member) {
    if (!member || !member.id || !member.guildId) return false;

    const cacheKey = `jail_roles_${member.guildId}_${member.id}`;
    const savedRolesRaw = await this.client.cache.get(cacheKey);

    if (!savedRolesRaw) {
      this.client.logger.warn(`Unjail: No saved roles found for ${member.id}.`);
      return false;
    }

    const rolesToRestore = JSON.parse(savedRolesRaw);

    try {
      await this.client.rest.patch(`/guilds/${member.guildId}/members/${member.id}`, {
        body: { roles: rolesToRestore }
      });
      
      await this.client.cache.delete(cacheKey);
      return true;
    } catch (error) {
      this.client.logger.error('Unjail failed:', error);
      return false;
    }
  }
}

module.exports = GuildManager;
