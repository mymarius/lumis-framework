'use strict';

class InventoryManager {
  
  constructor(client) {
    this.client = client;
  }

  _key(userId) {
    return `inv_items_${userId}`;
  }

  async getInventory(userId) {
    const val = await this.client.cache.get(this._key(userId));
    return val ? JSON.parse(val) : {};
  }

  async addItem(userId, itemName, amount = 1) {
    const inv = await this.getInventory(userId);
    if (!inv[itemName]) {
      inv[itemName] = 0;
    }
    inv[itemName] += amount;
    
    await this.client.cache.set(this._key(userId), JSON.stringify(inv));
    return inv;
  }

  async removeItem(userId, itemName, amount = 1) {
    const inv = await this.getInventory(userId);
    if (!inv[itemName] || inv[itemName] < amount) {
      return false;
    }

    inv[itemName] -= amount;
    if (inv[itemName] <= 0) {
      delete inv[itemName];
    }

    await this.client.cache.set(this._key(userId), JSON.stringify(inv));
    return true;
  }

  async hasItem(userId, itemName) {
    const inv = await this.getInventory(userId);
    return inv[itemName] || 0;
  }

  async clearInventory(userId) {
    await this.client.cache.delete(this._key(userId));
  }
}

module.exports = InventoryManager;
