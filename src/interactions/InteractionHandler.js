'use strict';

const Collection = require('../utils/Collection');

class InteractionHandler {
  
  constructor(client) {
    this.client = client;

    this.buttons = new Collection();

    this.selectMenus = new Collection();

    this.modals = new Collection();

    this.client.on('interactionCreate', (interaction) => this._handleInteraction(interaction));
  }

  onButton(customId, callback) {
    this.buttons.set(customId, callback);
  }

  onSelectMenu(customId, callback) {
    this.selectMenus.set(customId, callback);
  }

  onModal(customId, callback) {
    this.modals.set(customId, callback);
  }

  _findCallback(collection, customId) {
    const direct = collection.get(customId);
    if (direct) return direct;

    for (const [key, callback] of collection) {
      if (key instanceof RegExp && key.test(customId)) {
        return callback;
      }
    }

    return null;
  }

  async _handleInteraction(interaction) {
    try {
      if (interaction.isButton) {
        const callback = this._findCallback(this.buttons, interaction.customId);
        if (callback) await callback(interaction);
      } 
      else if (interaction.isMessageComponent && interaction.componentType >= 3 && interaction.componentType <= 8) {

        const callback = this._findCallback(this.selectMenus, interaction.customId);
        if (callback) await callback(interaction);
      }
      else if (interaction.isModalSubmit) {
        const callback = this._findCallback(this.modals, interaction.customId);
        if (callback) await callback(interaction);
      }
    } catch (error) {
      this.client.logger.error(`Interaction Handler Error (${interaction.customId}):`, error);
      if (typeof interaction.reply === 'function' && !interaction.replied && !interaction.deferred) {
        await interaction.reply({ content: '❌ An error occurred while executing this interaction.', ephemeral: true }).catch(() => {});
      }
    }
  }
}

module.exports = InteractionHandler;
