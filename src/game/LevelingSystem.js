'use strict';

class LevelingSystem {
  
  constructor(client, options = {}) {
    this.client = client;
    this.baseXp = options.baseXp || 500;
    this.multiplier = options.multiplier || 1.2;
    this.autoTrack = options.autoTrack !== false;
    
    this.minXp = options.minXpPerMessage || 5;
    this.maxXp = options.maxXpPerMessage || 15;
    this.cooldownSec = options.cooldown || 60;

    this._recentMessagers = new Set();

    if (this.autoTrack) {
      this.client.on('messageCreate', (message) => this._handleMessage(message));
    }
  }

  _key(userId) {
    return `level_xp_${userId}`;
  }

  calculateLevel(totalXp) {
    if (totalXp < this.baseXp) return 0;

    let tempXp = totalXp;
    let level = 0;
    let nextThreshold = this.baseXp;

    while (tempXp >= nextThreshold) {
      tempXp -= nextThreshold;
      level++;
      nextThreshold = Math.floor(nextThreshold * this.multiplier);
    }
    
    return level;
  }

  calculateNextLevelXp(currentLevel) {
    let required = this.baseXp;
    for (let i = 0; i < currentLevel; i++) {
      required = Math.floor(required * this.multiplier);
    }
    return required;
  }

  async getUserStats(userId) {
    const val = await this.client.cache.get(this._key(userId));
    const xp = val ? Number(val) : 0;
    return {
      xp,
      level: this.calculateLevel(xp)
    };
  }

  async addXP(userId, amount) {
    const stats = await this.getUserStats(userId);
    const newXp = stats.xp + amount;
    const newLevel = this.calculateLevel(newXp);

    await this.client.cache.set(this._key(userId), newXp);

    const leveledUp = newLevel > stats.level;
    
    if (leveledUp) {
      const user = this.client.users.get(userId) || { id: userId };
      this.client.emit('levelUp', user, newLevel);
    }

    return { xp: newXp, level: newLevel, leveledUp };
  }

  async _handleMessage(message) {
    if (message.author.bot) return;

    const userId = message.author.id;

    if (this._recentMessagers.has(userId)) return;

    const xpEarned = Math.floor(Math.random() * (this.maxXp - this.minXp + 1)) + this.minXp;
    await this.addXP(userId, xpEarned);

    this._recentMessagers.add(userId);
    setTimeout(() => {
      this._recentMessagers.delete(userId);
    }, this.cooldownSec * 1000).unref();
  }
}

module.exports = LevelingSystem;
