'use strict';

/**
 * Built-in guard functions for commands.
 * Guards are checked before middleware and command execution.
 * If any guard fails, the command is not executed and a message is sent.
 * 
 * @example
 * class BanCmd extends Command {
 *   constructor() {
 *     super({
 *       name: 'ban',
 *       guards: [
 *         Guards.guildOnly(),
 *         Guards.hasPermission('BAN_MEMBERS'),
 *         Guards.cooldown(3, '1m'),
 *       ]
 *     });
 *   }
 * }
 */
class Guards {

  /**
   * Only allow in guild (server) channels, not DMs.
   * @param {string} [message] 
   * @returns {GuardFn}
   */
  static guildOnly(message) {
    return {
      name: 'guildOnly',
      async check(interaction) {
        if (interaction.guildId) return { pass: true };
        return { pass: false, reason: message || '❌ This command can only be used in a server.' };
      }
    };
  }

  /**
   * Only allow in DM channels.
   * @param {string} [message]
   * @returns {GuardFn}
   */
  static dmOnly(message) {
    return {
      name: 'dmOnly',
      async check(interaction) {
        if (!interaction.guildId) return { pass: true };
        return { pass: false, reason: message || '❌ This command can only be used in DMs.' };
      }
    };
  }

  /**
   * Require the user to have specific Discord permissions.
   * @param  {...string} permissions - e.g. 'BAN_MEMBERS', 'KICK_MEMBERS'
   * @returns {GuardFn}
   */
  static hasPermission(...permissions) {
    return {
      name: 'hasPermission',
      async check(interaction) {
        if (!interaction.member || !interaction.member.permissions) {
          return { pass: false, reason: '❌ Could not verify permissions.' };
        }
        const memberPerms = interaction.member.permissions;
        const missing = permissions.filter(p => {
          if (typeof memberPerms === 'bigint' || typeof memberPerms === 'number') {
            const { PermissionFlags } = require('../utils/Constants');
            const flag = PermissionFlags[p];
            if (!flag) return true;
            return (BigInt(memberPerms) & BigInt(flag)) === 0n;
          }
          if (typeof memberPerms.has === 'function') {
            return !memberPerms.has(p);
          }
          return true;
        });
        if (missing.length === 0) return { pass: true };
        return { pass: false, reason: `❌ Missing permissions: \`${missing.join(', ')}\`` };
      }
    };
  }

  /**
   * Require the user to have a specific role.
   * @param {string} roleId 
   * @param {string} [message]
   * @returns {GuardFn}
   */
  static hasRole(roleId, message) {
    return {
      name: 'hasRole',
      async check(interaction) {
        const roles = interaction.member?.roles;
        if (!roles) return { pass: false, reason: message || '❌ Could not verify roles.' };
        const has = Array.isArray(roles) ? roles.includes(roleId) : (typeof roles.has === 'function' && roles.has(roleId));
        if (has) return { pass: true };
        return { pass: false, reason: message || `❌ You need the required role to use this command.` };
      }
    };
  }

  /**
   * Require the user to have ANY of the specified roles.
   * @param {string[]} roleIds
   * @param {string} [message]
   * @returns {GuardFn}
   */
  static hasAnyRole(roleIds, message) {
    return {
      name: 'hasAnyRole',
      async check(interaction) {
        const roles = interaction.member?.roles;
        if (!roles) return { pass: false, reason: message || '❌ Could not verify roles.' };
        const has = roleIds.some(id => {
          if (Array.isArray(roles)) return roles.includes(id);
          if (typeof roles.has === 'function') return roles.has(id);
          return false;
        });
        if (has) return { pass: true };
        return { pass: false, reason: message || '❌ You need one of the required roles.' };
      }
    };
  }

  /**
   * Prevent bots from using the command.
   * @returns {GuardFn}
   */
  static notBot() {
    return {
      name: 'notBot',
      async check(interaction) {
        if (interaction.user?.bot || interaction.author?.bot) {
          return { pass: false, reason: '❌ Bots cannot use this command.' };
        }
        return { pass: true };
      }
    };
  }

  /**
   * Only allow specific user IDs.
   * @param {string[]} userIds 
   * @param {string} [message]
   * @returns {GuardFn}
   */
  static ownerOnly(userIds, message) {
    return {
      name: 'ownerOnly',
      async check(interaction) {
        const userId = interaction.user?.id || interaction.author?.id;
        if (userIds.includes(userId)) return { pass: true };
        return { pass: false, reason: message || '❌ This command is restricted to bot owners.' };
      }
    };
  }

  /**
   * Only allow in NSFW channels.
   * @param {string} [message]
   * @returns {GuardFn}
   */
  static nsfw(message) {
    return {
      name: 'nsfw',
      async check(interaction) {
        if (interaction.channel?.nsfw) return { pass: true };
        return { pass: false, reason: message || '❌ This command can only be used in NSFW channels.' };
      }
    };
  }

  /**
   * Only allow in specific channels.
   * @param {string[]} channelIds
   * @param {string} [message]
   * @returns {GuardFn}
   */
  static channelOnly(channelIds, message) {
    return {
      name: 'channelOnly',
      async check(interaction) {
        const channelId = interaction.channelId || interaction.channel_id;
        if (channelIds.includes(channelId)) return { pass: true };
        return { pass: false, reason: message || '❌ This command cannot be used in this channel.' };
      }
    };
  }

  /**
   * Require the bot to have specific permissions in the channel.
   * @param {...string} permissions
   * @returns {GuardFn}
   */
  static botHasPermission(...permissions) {
    return {
      name: 'botHasPermission',
      async check(interaction) {
        const botMember = interaction.guild?.members?.get?.(interaction.client?.user?.id);
        if (!botMember) return { pass: true }; // Can't check, allow
        const missing = permissions.filter(p => {
          if (typeof botMember.permissions?.has === 'function') {
            return !botMember.permissions.has(p);
          }
          return false;
        });
        if (missing.length === 0) return { pass: true };
        return { pass: false, reason: `❌ Bot is missing permissions: \`${missing.join(', ')}\`` };
      }
    };
  }

  /**
   * Require the user to be in a voice channel.
   * @param {string} [message]
   * @returns {GuardFn}
   */
  static inVoiceChannel(message) {
    return {
      name: 'inVoiceChannel',
      async check(interaction) {
        const voiceState = interaction.member?.voice;
        if (voiceState && voiceState.channelId) return { pass: true };
        return { pass: false, reason: message || '❌ You must be in a voice channel.' };
      }
    };
  }

  /**
   * Custom guard with a user-defined check function.
   * @param {Function} checkFn - (interaction) => boolean | Promise<boolean>
   * @param {string} [message]
   * @returns {GuardFn}
   */
  static custom(checkFn, message) {
    return {
      name: 'custom',
      async check(interaction) {
        const result = await checkFn(interaction);
        if (result) return { pass: true };
        return { pass: false, reason: message || '❌ You do not meet the requirements for this command.' };
      }
    };
  }

  /**
   * Throttle per-user: max N uses per time window.
   * @param {number} maxUses 
   * @param {string} window - e.g. '1m', '30s', '1h'
   * @param {string} [message]
   * @returns {GuardFn}
   */
  static throttle(maxUses, window, message) {
    const ms = Guards._parseTime(window);
    const usageMap = new Map();

    // Cleanup interval
    const cleanup = setInterval(() => {
      const now = Date.now();
      for (const [key, data] of usageMap) {
        if (now - data.start > ms) usageMap.delete(key);
      }
    }, ms);
    if (cleanup.unref) cleanup.unref();

    return {
      name: 'throttle',
      async check(interaction) {
        const userId = interaction.user?.id || interaction.author?.id;
        const now = Date.now();
        const data = usageMap.get(userId);

        if (!data || now - data.start > ms) {
          usageMap.set(userId, { start: now, count: 1 });
          return { pass: true };
        }

        if (data.count >= maxUses) {
          const remaining = ((ms - (now - data.start)) / 1000).toFixed(1);
          return { pass: false, reason: message || `⏳ Rate limited. Try again in ${remaining}s.` };
        }

        data.count++;
        return { pass: true };
      }
    };
  }

  /**
   * Parse a time string like '30s', '5m', '1h' into ms.
   * @private
   */
  static _parseTime(str) {
    if (typeof str === 'number') return str;
    const match = String(str).match(/^(\d+)(s|m|h|d)$/);
    if (!match) return parseInt(str, 10) || 5000;
    const val = parseInt(match[1], 10);
    switch (match[2]) {
      case 's': return val * 1000;
      case 'm': return val * 60_000;
      case 'h': return val * 3_600_000;
      case 'd': return val * 86_400_000;
      default: return val * 1000;
    }
  }
}

/**
 * Runs all guards for a command. Returns { passed, failedGuard, reason } 
 * @param {object[]} guards 
 * @param {object} interaction 
 * @returns {Promise<{ passed: boolean, failedGuard?: string, reason?: string }>}
 */
Guards.runAll = async function (guards, interaction) {
  if (!guards || guards.length === 0) return { passed: true };

  for (const guard of guards) {
    const result = await guard.check(interaction);
    if (!result.pass) {
      return { passed: false, failedGuard: guard.name, reason: result.reason };
    }
  }
  return { passed: true };
};

module.exports = Guards;
