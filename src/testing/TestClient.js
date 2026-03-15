'use strict';

const { EventEmitter } = require('node:events');

/**
 * Built-in Test Framework for Discord bots.
 * Test commands without a real Discord connection.
 * 
 * @example
 * const { TestClient } = require('lumis-framework/testing');
 * const client = new TestClient();
 * 
 * const result = await client.simulateCommand('ping');
 * console.log(result.replied);    // true
 * console.log(result.content);    // 'Pong!'
 */
class TestClient extends EventEmitter {
  constructor(options = {}) {
    super();

    /** @type {Map<string, object>} Registered test commands */
    this.commands = new Map();

    /** @type {Array} History of all simulated interactions */
    this.history = [];

    /** @type {object} Mock user */
    this.user = options.user || {
      id: '000000000000000001',
      tag: 'TestBot#0001',
      username: 'TestBot',
      discriminator: '0001',
      bot: true,
    };

    this.ready = true;
    this.readyAt = new Date();
    this.guilds = new Map();
    this.channels = new Map();
    this.users = new Map();

    // Logger mock
    this.logger = {
      info: () => {},
      warn: () => {},
      error: () => {},
      debug: () => {},
      success: () => {},
    };

    // Services mock
    this.services = {
      get: () => null,
      has: () => false,
      inject: (t) => t,
    };

    this.ping = 0;
    this.uptime = 0;
  }

  /**
   * Register a command for testing.
   * @param {object} command - Command instance
   */
  register(command) {
    this.commands.set(command.name, command);
    return this;
  }

  /**
   * Simulate a slash command interaction.
   * @param {string} commandName 
   * @param {object} [options]
   * @param {object} [options.user] - Mock user
   * @param {object} [options.guild] - Mock guild
   * @param {object} [options.channel] - Mock channel
   * @param {object} [options.options] - Command options
   * @param {object} [options.member] - Mock member
   * @returns {Promise<TestResult>}
   */
  async simulateCommand(commandName, options = {}) {
    const command = this.commands.get(commandName);
    if (!command) {
      throw new Error(`Command "${commandName}" is not registered.`);
    }

    const result = new TestResult(commandName);
    const interaction = this._createMockInteraction(commandName, options, result);

    // Run guards if present
    if (command.guards && command.guards.length > 0) {
      const Guards = require('../guards/Guards');
      const guardResult = await Guards.runAll(command.guards, interaction);
      if (!guardResult.passed) {
        result._guardFailed = true;
        result._failedGuard = guardResult.failedGuard;
        result._guardReason = guardResult.reason;
        result._replied = true;
        result._replyContent = guardResult.reason;
        this.history.push(result);
        return result;
      }
    }

    try {
      await command.execute(interaction);
    } catch (error) {
      result._error = error;
    }

    this.history.push(result);
    return result;
  }

  /**
   * Simulate a message event.
   * @param {string} content 
   * @param {object} [options]
   * @returns {Promise<TestResult>}
   */
  async simulateMessage(content, options = {}) {
    const result = new TestResult('message');
    const message = this._createMockMessage(content, options, result);

    this.emit('messageCreate', message);

    // Wait for async handlers
    await new Promise(r => setImmediate(r));

    this.history.push(result);
    return result;
  }

  /**
   * Assert multiple test conditions.
   * @param {Array<{ description: string, fn: Function }>} tests 
   * @returns {{ passed: number, failed: number, results: Array }}
   */
  async runTests(tests) {
    const results = [];
    let passed = 0;
    let failed = 0;

    for (const test of tests) {
      try {
        await test.fn(this);
        results.push({ description: test.description, passed: true });
        passed++;
      } catch (error) {
        results.push({ description: test.description, passed: false, error: error.message });
        failed++;
      }
    }

    return { passed, failed, total: tests.length, results };
  }

  /**
   * Clear test history.
   */
  clearHistory() {
    this.history = [];
  }

  /** @private */
  _createMockInteraction(commandName, options, result) {
    const user = options.user || {
      id: '000000000000000002',
      tag: 'TestUser#0001',
      username: 'TestUser',
      discriminator: '0001',
      bot: false,
    };

    const guild = options.guild || {
      id: '000000000000000010',
      name: 'Test Guild',
      memberCount: 100,
    };

    const channel = options.channel || {
      id: '000000000000000020',
      name: 'test-channel',
      nsfw: false,
    };

    const interaction = {
      id: `test_${Date.now()}`,
      commandName,
      isCommand: true,
      isAutocomplete: false,
      user,
      member: options.member || { 
        user,
        roles: options.roles || [],
        permissions: options.permissions || 0n,
        voice: options.voice || {},
      },
      guild,
      guildId: guild.id,
      channel,
      channelId: channel.id,
      client: this,
      replied: false,
      deferred: false,

      options: {
        _data: options.options || {},
        getString: (name) => options.options?.[name] ?? null,
        getInteger: (name) => options.options?.[name] ?? null,
        getNumber: (name) => options.options?.[name] ?? null,
        getBoolean: (name) => options.options?.[name] ?? null,
        getUser: (name) => options.options?.[name] ?? null,
        getChannel: (name) => options.options?.[name] ?? null,
        getRole: (name) => options.options?.[name] ?? null,
        getMember: (name) => options.options?.[name] ?? null,
        getSubcommand: () => options.subcommand ?? null,
        getSubcommandGroup: () => options.subcommandGroup ?? null,
        get: (name) => options.options?.[name] ?? null,
      },

      reply: async (data) => {
        result._replied = true;
        result._replyContent = typeof data === 'string' ? data : data?.content;
        result._replyData = data;
        result._ephemeral = data?.ephemeral || false;
        interaction.replied = true;
        return result;
      },

      deferReply: async (opts) => {
        result._deferred = true;
        result._ephemeral = opts?.ephemeral || false;
        interaction.deferred = true;
      },

      editReply: async (data) => {
        result._edited = true;
        result._editContent = typeof data === 'string' ? data : data?.content;
        result._editData = data;
      },

      followUp: async (data) => {
        result._followUps.push(typeof data === 'string' ? data : data);
      },

      deferUpdate: async () => {
        result._deferUpdated = true;
      },

      showModal: async (modal) => {
        result._modalShown = true;
        result._modalData = modal;
      },
    };

    return interaction;
  }

  /** @private */
  _createMockMessage(content, options, result) {
    const user = options.user || {
      id: '000000000000000002',
      tag: 'TestUser#0001',
      username: 'TestUser',
      bot: false,
    };

    return {
      id: `msg_${Date.now()}`,
      content,
      author: user,
      member: options.member || { user, roles: [] },
      guild: options.guild || { id: '000000000000000010', name: 'Test Guild' },
      channel: {
        id: options.channelId || '000000000000000020',
        send: async (data) => {
          result._replied = true;
          result._replyContent = typeof data === 'string' ? data : data?.content;
          result._replyData = data;
        },
      },
      reply: async (data) => {
        result._replied = true;
        result._replyContent = typeof data === 'string' ? data : data?.content;
        result._replyData = data;
      },
      delete: async () => {
        result._deleted = true;
      },
      react: async (emoji) => {
        result._reactions.push(emoji);
      },
    };
  }
}

/**
 * Test result object with assertion helpers.
 */
class TestResult {
  constructor(commandName) {
    this.commandName = commandName;
    this._replied = false;
    this._replyContent = null;
    this._replyData = null;
    this._deferred = false;
    this._deferUpdated = false;
    this._ephemeral = false;
    this._edited = false;
    this._editContent = null;
    this._editData = null;
    this._followUps = [];
    this._modalShown = false;
    this._modalData = null;
    this._error = null;
    this._deleted = false;
    this._reactions = [];
    this._guardFailed = false;
    this._failedGuard = null;
    this._guardReason = null;
  }

  /** Whether the interaction was replied to */
  get replied() { return this._replied; }
  /** The reply content string */
  get content() { return this._replyContent; }
  /** The full reply data */
  get data() { return this._replyData; }
  /** Whether reply was deferred */
  get deferred() { return this._deferred; }
  /** Whether defer updated */
  get deferUpdated() { return this._deferUpdated; }
  /** Whether reply was ephemeral */
  get ephemeral() { return this._ephemeral; }
  /** Whether reply was edited */
  get edited() { return this._edited; }
  /** Edit content */
  get editContent() { return this._editContent; }
  /** Follow-up messages */
  get followUps() { return this._followUps; }
  /** Whether a modal was shown */
  get modalShown() { return this._modalShown; }
  /** Modal data */
  get modalData() { return this._modalData; }
  /** Error if thrown */
  get error() { return this._error; }
  /** Whether message was deleted */
  get deleted() { return this._deleted; }
  /** Reactions added */
  get reactions() { return this._reactions; }
  /** Whether a guard blocked execution */
  get guardFailed() { return this._guardFailed; }
  /** Name of the failed guard */
  get failedGuard() { return this._failedGuard; }
  /** Reason the guard failed */
  get guardReason() { return this._guardReason; }

  /** Assert that the interaction was replied to */
  assertReplied() {
    if (!this._replied) throw new Error(`Expected command "${this.commandName}" to reply, but it did not.`);
    return this;
  }

  /** Assert reply contains specific text */
  assertContentContains(text) {
    if (!this._replyContent || !this._replyContent.includes(text)) {
      throw new Error(`Expected reply to contain "${text}", got: "${this._replyContent}"`);
    }
    return this;
  }

  /** Assert reply content equals */
  assertContentEquals(text) {
    if (this._replyContent !== text) {
      throw new Error(`Expected reply to equal "${text}", got: "${this._replyContent}"`);
    }
    return this;
  }

  /** Assert ephemeral */
  assertEphemeral() {
    if (!this._ephemeral) throw new Error(`Expected ephemeral reply for "${this.commandName}".`);
    return this;
  }

  /** Assert no error */
  assertNoError() {
    if (this._error) throw new Error(`Unexpected error in "${this.commandName}": ${this._error.message}`);
    return this;
  }

  /** Assert guard passed */
  assertGuardPassed() {
    if (this._guardFailed) throw new Error(`Guard "${this._failedGuard}" failed: ${this._guardReason}`);
    return this;
  }

  /** Assert guard failed */
  assertGuardFailed(guardName) {
    if (!this._guardFailed) throw new Error(`Expected guard to fail for "${this.commandName}".`);
    if (guardName && this._failedGuard !== guardName) {
      throw new Error(`Expected guard "${guardName}" to fail, but "${this._failedGuard}" failed.`);
    }
    return this;
  }
}

module.exports = { TestClient, TestResult };
