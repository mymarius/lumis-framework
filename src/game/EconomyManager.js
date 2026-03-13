'use strict';

class EconomyManager {
  
  constructor(client, options = {}) {
    this.client = client;
    this.currencyName = options.currencyName || 'Coins';
    this.currencySymbol = options.currencySymbol || '💰';
    this.defaultBalance = options.defaultBalance || 0;
  }

  _key(userId) {
    return `eco_balance_${userId}`;
  }

  async getBalance(userId) {
    const val = await this.client.cache.get(this._key(userId));
    if (val === null || val === undefined) return this.defaultBalance;
    return Number(val);
  }

  async addBalance(userId, amount) {
    if (amount <= 0) return this.getBalance(userId);
    const current = await this.getBalance(userId);
    const newBalance = current + amount;

    await this.client.cache.set(this._key(userId), newBalance);
    return newBalance;
  }

  async removeBalance(userId, amount) {
    if (amount <= 0) return this.getBalance(userId);
    const current = await this.getBalance(userId);
    if (current < amount) return false; // Insufficient balance
    
    const newBalance = current - amount;
    await this.client.cache.set(this._key(userId), newBalance);
    return newBalance;
  }

  async transfer(fromUserId, toUserId, amount) {
    if (amount <= 0) return false;
    
    const fromBalance = await this.getBalance(fromUserId);
    if (fromBalance < amount) return false;

    await this.removeBalance(fromUserId, amount);
    await this.addBalance(toUserId, amount);
    return true;
  }

  async getLeaderboard(limit = 10) {
    const users = [];
    const prefix = 'eco_balance_';

    if (this.client.cache.adapter.name === 'MemoryAdapter') {
      for (const [key, value] of this.client.cache.adapter.store.entries()) {
        if (typeof key === 'string' && key.startsWith(prefix)) {
          users.push({
            userId: key.slice(prefix.length),
            balance: Number(value.value)
          });
        }
      }
    } else {

      this.client.logger.warn('Leaderboard is currently only supported for MemoryAdapter. Support for external databases coming soon.');
    }

    return users.sort((a, b) => b.balance - a.balance).slice(0, limit);
  }
}

module.exports = EconomyManager;
