'use strict';

const BaseCollector = require('./BaseCollector');
const { Events } = require('./Constants');

class InteractionCollector extends BaseCollector {
  
  constructor(client, filter, options = {}) {
    super(client, filter, options);
    this.messageId = options.messageId;
    this.channelId = options.channelId;
    this.interactionType = options.interactionType;

    this.listener = (interaction) => {
      if (this.channelId && interaction.channelId !== this.channelId) return;
      if (this.messageId && interaction.message?.id !== this.messageId) return;
      if (this.interactionType && interaction.type !== this.interactionType) return;

      this.handleCollect(interaction);
    };

    this.client.on(Events.INTERACTION_CREATE, this.listener);

    this.once('end', () => {
      this.client.off(Events.INTERACTION_CREATE, this.listener);
    });
  }
}

module.exports = InteractionCollector;
