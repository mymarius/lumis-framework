'use strict';

const BaseCollector = require('./BaseCollector');
const { Events } = require('./Constants');

class MessageCollector extends BaseCollector {
  
  constructor(client, channel, filter, options = {}) {
    super(client, filter, options);
    this.channel = channel;

    this.listener = (message) => {
      if (this.channel && message.channelId !== this.channel.id) return;
      this.handleCollect(message);
    };

    this.client.on(Events.MESSAGE_CREATE, this.listener);

    this.once('end', () => {
      this.client.off(Events.MESSAGE_CREATE, this.listener);
    });
  }

  collectId(message) {
    return message.id;
  }
}

module.exports = MessageCollector;
