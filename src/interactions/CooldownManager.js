'use strict';

const Collection = require('../utils/Collection');

class CooldownManager {
  constructor() {
    
    this.cooldowns = new Collection();
  }

  check(commandName, userId, cooldownSeconds) {
    if (!commandName || !userId || !cooldownSeconds) return { onCooldown: false, msLeft: 0 };

    const now = Date.now();
    const cooldownAmount = cooldownSeconds * 1000;

    if (!this.cooldowns.has(commandName)) {
      this.cooldowns.set(commandName, new Collection());
    }

    const timestamps = this.cooldowns.get(commandName);

    if (timestamps.has(userId)) {
      const expirationTime = timestamps.get(userId) + cooldownAmount;

      if (now < expirationTime) {
        return { onCooldown: true, msLeft: expirationTime - now };
      }
    }

    return { onCooldown: false, msLeft: 0 };
  }

  set(commandName, userId, cooldownSeconds) {
    if (!commandName || !userId || !cooldownSeconds) return;

    if (!this.cooldowns.has(commandName)) {
      this.cooldowns.set(commandName, new Collection());
    }

    const timestamps = this.cooldowns.get(commandName);
    timestamps.set(userId, Date.now());

    setTimeout(() => {
      if (timestamps.has(userId)) {
        timestamps.delete(userId);
      }
    }, cooldownSeconds * 1000).unref();
  }

  delete(commandName, userId) {
    if (this.cooldowns.has(commandName)) {
      this.cooldowns.get(commandName).delete(userId);
    }
  }

  clear() {
    this.cooldowns.clear();
  }
}

module.exports = CooldownManager;
