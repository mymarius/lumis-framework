'use strict';

const Collection = require('../utils/Collection');
const { Endpoints } = require('../utils/Constants');
const { LumisError } = require('../errors/LumisError');
const { ErrorCodes } = require('../errors/ErrorCodes');
const CooldownManager = require('./CooldownManager');
const fs = require('fs');
const path = require('path');

class CommandManager {
  
  constructor(client, options = {}) {
    this.client = client;
    this.prefix = options.prefix || null;
    this.autoSync = options.autoSync !== false;
    this.directory = options.directory || null;

    this.commands = new Collection();

    this.aliases = new Collection();

    this.cooldowns = new CooldownManager();

    this.client.on('interactionCreate', (interaction) => this._handleInteraction(interaction));
    this.client.on('messageCreate', (message) => this._handleMessage(message));
    
    if (this.autoSync) {
      this.client.on('ready', () => this.syncCommands());
    }

    if (this.directory) {
      this.loadFromDirectory(this.directory);
    }
  }

  register(command) {
    if (!command.name) throw new Error('Command object must have a "name".');
    this.commands.set(command.name, command);

    if (command.aliases && Array.isArray(command.aliases)) {
      for (const alias of command.aliases) {
        this.aliases.set(alias, command.name);
      }
    }
    
    this.client.logger.debug(`Loaded command: ${command.name}`);
  }

  loadFromDirectory(dirPath) {
    const absolutePath = path.resolve(dirPath);
    if (!fs.existsSync(absolutePath)) return;

    const stat = fs.statSync(absolutePath);
    if (!stat.isDirectory()) return;

    const files = fs.readdirSync(absolutePath);
    for (const file of files) {
      const fullPath = path.join(absolutePath, file);
      const fileStat = fs.statSync(fullPath);

      if (fileStat.isDirectory()) {
        this.loadFromDirectory(fullPath);
      } else if (file.endsWith('.js')) {
        try {
          const CommandClass = require(fullPath);
          const command = new CommandClass();
          this.register(command);
        } catch (error) {
          this.client.logger.error(`Failed to load command (${fullPath}):`, error);
        }
      }
    }
  }

  async syncCommands() {
    if (!this.client.user) return;
    
    const payload = this.commands.map(cmd => cmd.toJSON());
    if (payload.length === 0) return;

    this.client.logger.info(`Discord API'ye ${payload.length} adet Slash Komut senkronize ediliyor...`);

    try {
      await this.client.rest.put(Endpoints.APPLICATION_COMMANDS(this.client.user.id), {
        body: payload
      });
      this.client.logger.info('Slash Commands synced successfully.');
    } catch (error) {
      this.client.logger.error('Failed to sync Slash Commands:', error);
    }
  }

  async _handleInteraction(interaction) {

    if (!interaction.isCommand && !interaction.isAutocomplete) return;

    const command = this.commands.get(interaction.commandName);
    if (!command) return;

    try {
      if (interaction.isAutocomplete) {
        if (typeof command.autocomplete === 'function') {
          await command.autocomplete(interaction);
        }
      } else {

        if (command.cooldown > 0) {
          const cooldownStatus = this.cooldowns.check(command.name, interaction.user.id, command.cooldown);
          if (cooldownStatus.onCooldown) {
            const secondsLeft = (cooldownStatus.msLeft / 1000).toFixed(1);
            if (typeof interaction.reply === 'function' && !interaction.replied && !interaction.deferred) {
              await interaction.reply({ 
                content: `⏳ You must wait before using this command again. \`${secondsLeft} saniye\` beklemelisin.`, 
                ephemeral: true 
              }).catch(() => {});
            }
            return;
          }
          this.cooldowns.set(command.name, interaction.user.id, command.cooldown);
        }

        await command.execute(interaction);
      }
    } catch (error) {
      this.client.logger.error(`Error executing command (${command.name}):`, error);

      if (typeof interaction.reply === 'function' && !interaction.replied && !interaction.deferred) {
        await interaction.reply({ content: '❌ An error occurred while executing this command.', ephemeral: true }).catch(() => {});
      }
    }
  }

  async _handleMessage(message) {
    if (!this.prefix || message.author.bot) return;
    
    if (!message.content.startsWith(this.prefix)) return;

    const args = message.content.slice(this.prefix.length).trim().split(/ +/);
    const commandName = args.shift().toLowerCase();

    const actualName = this.commands.has(commandName) 
      ? commandName 
      : this.aliases.get(commandName);

    if (!actualName) return;

    const command = this.commands.get(actualName);

    if (command.cooldown > 0) {
      const cooldownStatus = this.cooldowns.check(command.name, message.author.id, command.cooldown);
      if (cooldownStatus.onCooldown) {
        const secondsLeft = (cooldownStatus.msLeft / 1000).toFixed(1);
        await message.reply(`⏳ You must wait before using this command again. \`${secondsLeft} saniye\` beklemelisin.`).catch(() => {});
        return;
      }
      this.cooldowns.set(command.name, message.author.id, command.cooldown);
    }

    try {

      await command.execute(message, args);
    } catch (error) {
      this.client.logger.error(`Error executing prefix command (${actualName}):`, error);
    }
  }
}

module.exports = CommandManager;
