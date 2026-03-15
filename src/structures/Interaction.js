'use strict';

const { Endpoints } = require('../utils/Constants');
const { LumisError } = require('../errors/LumisError');
const { ErrorCodes } = require('../errors/ErrorCodes');

class Interaction {
  constructor(client, data) {
    this.client = client;
    this.id = data.id;
    this.applicationId = data.application_id;
    this.type = data.type;
    this.token = data.token;
    this.version = data.version;
    this.guildId = data.guild_id || null;
    this.channelId = data.channel_id || null;
    this.appPermissions = data.app_permissions ? BigInt(data.app_permissions) : null;
    this.guildLocale = data.guild_locale || null;
    this.locale = data.locale || null;

    const User = require('./User');
    this.user = new User(this.client, data.member ? data.member.user : data.user);

    if (data.member && this.guildId) {
      const Member = require('./Member');

      const guild = this.client.guilds.get(this.guildId);
      this.member = new Member(this.client, guild || { id: this.guildId }, data.member);
    } else {
      this.member = null;
    }

    this.replied = false;

    this.deferred = false;
  }

  get channel() {
    return this.client.channels.get(this.channelId) || null;
  }

  get guild() {
    return this.client.guilds.get(this.guildId) || null;
  }

  get isCommand() {
    return this.type === 2;
  }

  get isMessageComponent() {
    return this.type === 3;
  }

  get isAutocomplete() {
    return this.type === 4;
  }

  get isModalSubmit() {
    return this.type === 5;
  }

  async reply(options) {
    if (this.replied || this.deferred) throw new LumisError(ErrorCodes.INTERACTION_ALREADY_REPLIED);

    let data;
    if (typeof options === 'string') {
      data = { content: options };
    } else {
      data = { ...options };
      if (data.embeds) data.embeds = data.embeds.map(e => (typeof e.toJSON === 'function' ? e.toJSON() : e));
    }

    if (options.ephemeral) {
      data.flags = (data.flags || 0) | 64; // 1 << 6
    }

    await this.client.rest.post(Endpoints.INTERACTION_CALLBACK(this.id, this.token), {
      body: {
        type: 4, // CHANNEL_MESSAGE_WITH_SOURCE
        data
      }
    });

    this.replied = true;
  }

  async deferReply(options = {}) {
    if (this.replied || this.deferred) throw new LumisError(ErrorCodes.INTERACTION_ALREADY_REPLIED);

    let data = {};
    if (options.ephemeral) {
      data.flags = 64;
    }

    await this.client.rest.post(Endpoints.INTERACTION_CALLBACK(this.id, this.token), {
      body: {
        type: 5, // DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE
        data
      }
    });

    this.deferred = true;
  }

  async editReply(options) {
    if (!this.replied && !this.deferred) throw new LumisError(ErrorCodes.INTERACTION_CALLBACK_NOT_FOUND);

    let data;
    if (typeof options === 'string') {
      data = { content: options };
    } else {
      data = { ...options };
      if (data.embeds) data.embeds = data.embeds.map(e => (typeof e.toJSON === 'function' ? e.toJSON() : e));
    }

    const res = await this.client.rest.patch(`/webhooks/${this.applicationId}/${this.token}/messages/@original`, {
      body: data
    });

    const Message = require('./Message');
    return new Message(this.client, res, this.channel);
  }

  async deleteReply() {
    if (!this.replied && !this.deferred) throw new LumisError(ErrorCodes.INTERACTION_CALLBACK_NOT_FOUND);
    await this.client.rest.delete(`/webhooks/${this.applicationId}/${this.token}/messages/@original`);
  }

  async followUp(options) {
    let data;
    if (typeof options === 'string') {
      data = { content: options };
    } else {
      data = { ...options };
      if (data.embeds) data.embeds = data.embeds.map(e => (typeof e.toJSON === 'function' ? e.toJSON() : e));
    }

    if (options.ephemeral) {
      data.flags = (data.flags || 0) | 64;
    }

    const res = await this.client.rest.post(`/webhooks/${this.applicationId}/${this.token}`, {
      body: data
    });

    const Message = require('./Message');
    return new Message(this.client, res, this.channel);
  }

  async showModal(modal) {
    if (this.replied || this.deferred) throw new LumisError(ErrorCodes.INTERACTION_ALREADY_REPLIED);

    await this.client.rest.post(Endpoints.INTERACTION_CALLBACK(this.id, this.token), {
      body: {
        type: 9, // APPLICATION_MODAL
        data: modal
      }
    });

    this.replied = true;
  }
}

class MessageComponentInteraction extends Interaction {
  constructor(client, data) {
    super(client, data);

    this.componentType = data.data.component_type;

    this.customId = data.data.custom_id;

    this.values = data.data.values;

    if (data.message) {
      const Message = require('./Message');
      this.message = new Message(this.client, data.message, this.channel);
    } else {
      this.message = null;
    }
  }

  get isButton() {
    return this.componentType === 2;
  }

  get isStringSelectMenu() {
    return this.componentType === 3;
  }

  async deferUpdate() {
    if (this.replied || this.deferred) throw new LumisError(ErrorCodes.INTERACTION_ALREADY_REPLIED);

    await this.client.rest.post(Endpoints.INTERACTION_CALLBACK(this.id, this.token), {
      body: {
        type: 6, // DEFERRED_UPDATE_MESSAGE
      }
    });

    this.deferred = true;
  }

  async update(options) {
    if (this.replied || this.deferred) throw new LumisError(ErrorCodes.INTERACTION_ALREADY_REPLIED);

    let data;
    if (typeof options === 'string') {
      data = { content: options };
    } else {
      data = { ...options };
      if (data.embeds) data.embeds = data.embeds.map(e => (typeof e.toJSON === 'function' ? e.toJSON() : e));
    }

    await this.client.rest.post(Endpoints.INTERACTION_CALLBACK(this.id, this.token), {
      body: {
        type: 7, // UPDATE_MESSAGE
        data
      }
    });

    this.replied = true;
  }
}

class ModalSubmitInteraction extends Interaction {
  constructor(client, data) {
    super(client, data);

    this.customId = data.data.custom_id;

    const Collection = require('../utils/Collection');
    this.fields = new Collection();

    if (data.data.components) {
      for (const rawField of data.data.components) {
        if (rawField.type === 1) { // ActionRow
          const component = rawField.components[0];
          if (component) {
            this.fields.set(component.custom_id, component.value);
          }
        }
      }
    }
  }

  getTextInputValue(customId) {
    return this.fields.get(customId) || null;
  }
}

class CommandInteraction extends Interaction {
  constructor(client, data) {
    super(client, data);

    this.commandName = data.data.name;

    this.commandType = data.data.type;

    const Collection = require('../utils/Collection');
    this.options = new Collection();

    this._parseOptions(data.data.options);
  }

  _parseOptions(optionsData) {
    if (!optionsData) return;

    for (const opt of optionsData) {
      if (opt.type === 1 || opt.type === 2) {

        this.subcommand = opt.name;
        this._parseOptions(opt.options);
      } else {
        this.options.set(opt.name, opt.value);
      }
    }
  }

  getOption(name) {
    return this.options.get(name);
  }

  async respond(choices) {
    if (!this.isAutocomplete) throw new LumisError(ErrorCodes.INTERACTION_NOT_AUTOCOMPLETE);

    await this.client.rest.post(Endpoints.INTERACTION_CALLBACK(this.id, this.token), {
      body: {
        type: 8, // APPLICATION_COMMAND_AUTOCOMPLETE_RESULT
        data: { choices }
      }
    });

    this.replied = true;
  }
}

function createInteraction(client, data) {
  if (data.type === 2 || data.type === 4) {
    return new CommandInteraction(client, data);
  } else if (data.type === 3) {
    return new MessageComponentInteraction(client, data);
  } else if (data.type === 5) {
    return new ModalSubmitInteraction(client, data);
  }
  return new Interaction(client, data);
}

module.exports = {
  Interaction,
  CommandInteraction,
  MessageComponentInteraction,
  ModalSubmitInteraction,
  createInteraction
};
