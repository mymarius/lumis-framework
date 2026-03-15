'use strict';

const { EventEmitter } = require('node:events');
const { request } = require('undici');
const Collection = require('../utils/Collection');
const { Events } = require('../utils/Constants');

const DEFAULT_OPTIONS = {
  defaultSearchPlatform: 'ytsearch',
  nodes: []
};

class LavalinkNode {
  constructor({ host, port, password, secure = false, name } = {}) {
    if (!host) throw new TypeError('lavalink node host is required');
    if (!port) throw new TypeError('lavalink node port is required');
    if (!password) throw new TypeError('lavalink node password is required');

    this.host = host;
    this.port = port;
    this.password = password;
    this.secure = Boolean(secure);
    this.name = name || `${host}:${port}`;
  }

  get baseURL() {
    return `${this.secure ? 'https' : 'http'}://${this.host}:${this.port}`;
  }

  async loadTracks(identifier) {
    const url = `${this.baseURL}/loadtracks?identifier=${encodeURIComponent(identifier)}`;
    const res = await request(url, {
      headers: { Authorization: this.password }
    });

    if (res.statusCode !== 200) {
      const body = await res.body.text();
      throw new Error(`Lavalink loadtracks failed (${res.statusCode}): ${body}`);
    }

    return res.body.json();
  }

  async createSession(guildId, body) {
    const url = `${this.baseURL}/v4/session/${guildId}`;
    const res = await request(url, {
      method: 'POST',
      headers: {
        Authorization: this.password,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    if (res.statusCode !== 204) {
      const text = await res.body.text();
      throw new Error(`Lavalink session create failed (${res.statusCode}): ${text}`);
    }

    return true;
  }

  async play(guildId, track, options = {}) {
    const url = `${this.baseURL}/v4/player/${guildId}/play`;

    const body = {
      track,
      noReplace: options.noReplace ?? false,
      pause: options.pause ?? false,
      startTime: options.startTime ?? 0,
      endTime: options.endTime ?? 0,
      volume: options.volume ?? 100
    };

    const res = await request(url, {
      method: 'POST',
      headers: {
        Authorization: this.password,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    if (res.statusCode !== 204) {
      const text = await res.body.text();
      throw new Error(`Lavalink play failed (${res.statusCode}): ${text}`);
    }

    return true;
  }

  async stop(guildId) {
    const url = `${this.baseURL}/v4/player/${guildId}/stop`;
    const res = await request(url, {
      method: 'POST',
      headers: { Authorization: this.password }
    });

    if (res.statusCode !== 204) {
      const text = await res.body.text();
      throw new Error(`Lavalink stop failed (${res.statusCode}): ${text}`);
    }

    return true;
  }
}

class MusicManager extends EventEmitter {
  constructor(client, options = {}) {
    super();

    this.client = client;
    this.options = { ...DEFAULT_OPTIONS, ...options };

    /**
     * Lavalink nodes (optional). Example:
     * [{ host: '127.0.0.1', port: 2333, password: 'yours', secure: false }]
     */
    this.nodes = (this.options.nodes || []).map((node) => new LavalinkNode(node));
    this._nodeIndex = 0;

    /**
     * Map of guild id -> player
     * @type {Collection<string, MusicPlayer>}
     */
    this.players = new Collection();

    /**
     * Backward-compatible queue storage
     * @type {Collection<string, Object>}
     */
    this.queues = new Collection();

    /**
     * Cache voice session data needed for Lavalink voice session updates.
     * @type {Map<string, any>}
     */
    this.voiceStates = new Map();
    this.voiceServers = new Map();

    this.client.on(Events.VOICE_STATE_UPDATE, (data) => this.updateVoiceState(data));
    this.client.on(Events.VOICE_SERVER_UPDATE, (data) => this.updateVoiceServer(data));
  }

  _getNextNode() {
    if (!this.nodes.length) return null;
    const node = this.nodes[this._nodeIndex % this.nodes.length];
    this._nodeIndex += 1;
    return node;
  }

  _formatSearchQuery(query) {
    if (typeof query !== 'string') return query;
    if (query.startsWith('http://') || query.startsWith('https://')) return query;
    return `${this.options.defaultSearchPlatform}:${query}`;
  }

  /**
   * Create or fetch an existing player for a guild.
   * @param {Object} options
   * @param {string} options.guildId
   * @param {string} options.voiceChannel
   * @param {string} [options.textChannel]
   * @param {boolean} [options.deaf=true]
   * @param {boolean} [options.mute=false]
   */
  createConnection({ guildId, voiceChannel, textChannel = null, deaf = true, mute = false } = {}) {
    if (!guildId) throw new TypeError('guildId is required');
    if (!voiceChannel) throw new TypeError('voiceChannel is required');

    let player = this.players.get(guildId);
    if (player) return player;

    const node = this._getNextNode();

    this.joinVoiceChannel(guildId, voiceChannel, { deaf, mute });

    player = new MusicPlayer(this, {
      guildId,
      voiceChannel,
      textChannel,
      deaf,
      mute,
      node
    });

    this.players.set(guildId, player);
    return player;
  }

  /**
   * Resolve a search query into a track/playlist result.
   * This is a minimal stub implementation. For real usage, replace with a proper search provider.
   * @param {Object} options
   * @param {string} options.query
   * @param {any} [options.requester]
   */
  async resolve({ query, requester = null } = {}) {
    if (!query) throw new TypeError('query is required');

    // If nodes are configured, use Lavalink to resolve the query.
    // Otherwise, fallback to a simple stub implementation.
    const node = this._getNextNode();
    if (node) {
      const identifier = this._formatSearchQuery(query);
      const data = await node.loadTracks(identifier);

      const tracks = (data.tracks || []).map((t) => ({
        title: t.info.title,
        uri: t.info.uri,
        identifier: t.info.identifier,
        author: t.info.author,
        duration: t.info.length,
        isStream: t.info.isStream,
        requester,
        track: t.track,
        raw: t
      }));

      return {
        loadType: data.loadType,
        tracks,
        playlistInfo: data.playlistInfo || null
      };
    }

    const track = this._buildTrack(query, requester);

    return {
      loadType: 'search',
      tracks: [track],
      playlistInfo: null
    };
  }

  /**
   * Build a track object similar to Aqualink's track shape.
   * @param {string|Object} query
   * @param {any} requester
   */
  _buildTrack(query, requester) {
    const identifier = typeof query === 'string' ? query : query.uri || query.identifier;
    const title = typeof query === 'string' ? query : query.title || identifier;

    return {
      title,
      uri: identifier || '',
      identifier: identifier || '',
      author: (requester && requester.username) || 'Lumis',
      duration: 0,
      isStream: false,
      requester
    };
  }

  async joinVoiceChannel(guildId, channelId, options = {}) {
    if (!this.client.ws || !this.client.ws.ws) {
      this.client.logger.error('No WebSocket connection, cannot join voice channel.');
      return false;
    }

    const { deaf = true, mute = false } = options;

    const payload = {
      op: 4,
      d: {
        guild_id: String(guildId),
        channel_id: String(channelId),
        self_mute: Boolean(mute),
        self_deaf: Boolean(deaf)
      }
    };

    this.client.ws.ws.send(JSON.stringify(payload));

    if (!this.queues.has(guildId)) {
      this.queues.set(guildId, {
        textChannel: null,
        voiceChannel: channelId,
        connection: null, // İleride WebRTC bağlantısı eklenebilir
        songs: [],
        volume: 100,
        playing: false
      });
    } else {
      const queue = this.queues.get(guildId);
      queue.voiceChannel = channelId;
    }

    this.client.logger.info(`Voice channel join request sent: ${channelId}`);
    return true;
  }

  async leaveVoiceChannel(guildId) {
    if (!this.client.ws || !this.client.ws.ws) return;

    const payload = {
      op: 4,
      d: {
        guild_id: String(guildId),
        channel_id: null,
        self_mute: false,
        self_deaf: false
      }
    };

    this.client.ws.ws.send(JSON.stringify(payload));

    this.queues.delete(guildId);
    this.voiceStates.delete(guildId);
    this.voiceServers.delete(guildId);

    const player = this.players.get(guildId);
    if (player) player.destroy();
    this.players.delete(guildId);
  }

  async updateVoiceState(data) {
    const { guild_id: guildId } = data;
    this.voiceStates.set(guildId, data);

    const player = this.players.get(guildId);
    if (!player) return;

    player.voiceState = data;
    await this._sendLavalinkVoiceUpdate(player);
  }

  async updateVoiceServer(data) {
    const { guild_id: guildId } = data;
    this.voiceServers.set(guildId, data);

    const player = this.players.get(guildId);
    if (!player) return;

    player.voiceServer = data;
    await this._sendLavalinkVoiceUpdate(player);
  }

  async _sendLavalinkVoiceUpdate(player) {
    if (!player.voiceServer || !player.voiceState || !player.node) return;

    try {
      await player.node.createSession(player.guildId, {
        voiceServer: player.voiceServer,
        voiceState: player.voiceState
      });
    } catch (error) {
      this.client.logger.error(`Lavalink voice update failed for guild ${player.guildId}: ${error.message}`);
    }
  }

  /**
   * Backwards compatible helper.
   * @param {string} guildId
   */
  getQueue(guildId) {
    const player = this.players.get(guildId);
    if (player) return player.queue;
    return this.queues.get(guildId) || null;
  }

  /**
   * Backwards-compatible helper to add a track to a guild queue.
   * @param {string} guildId
   * @param {Object} song
   */
  addTrack(guildId, song) {
    const player = this.players.get(guildId);
    if (player) {
      player.queue.add(song);
      return true;
    }

    const queue = this.queues.get(guildId);
    if (!queue) {
      this.client.logger.warn(`Queue not found. Please join a voice channel first (${guildId}).`);
      return false;
    }

    queue.songs.push(song);
    return true;
  }

  /**
   * Backwards-compatible play helper.
   * @param {string} guildId
   */
  play(guildId) {
    const player = this.players.get(guildId);
    if (player) return player.play();

    const queue = this.queues.get(guildId);
    if (!queue || queue.songs.length === 0) return false;

    queue.playing = true;
    const currentSong = queue.songs[0];

    this.client.logger.info(`(SIMULATED) Now playing: ${currentSong.title} (Duration: ${currentSong.duration})`);
    return true;
  }

  /**
   * Backwards-compatible skip helper.
   * @param {string} guildId
   */
  skip(guildId) {
    const player = this.players.get(guildId);
    if (player) return player.skip();

    const queue = this.queues.get(guildId);
    if (!queue || queue.songs.length === 0) return false;

    const skipped = queue.songs.shift();

    if (queue.songs.length > 0) {
      this.play(guildId);
    } else {
      queue.playing = false;
    }

    return skipped;
  }
}

class PlayerQueue {
  constructor(player) {
    this.player = player;
    this.tracks = [];
  }

  add(...tracks) {
    this.tracks.push(...tracks);
    return this.tracks.length;
  }

  shift() {
    return this.tracks.shift();
  }

  remove(index) {
    if (index < 0 || index >= this.tracks.length) return null;
    return this.tracks.splice(index, 1)[0];
  }

  clear() {
    this.tracks = [];
    return this.tracks;
  }

  shuffle() {
    for (let i = this.tracks.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.tracks[i], this.tracks[j]] = [this.tracks[j], this.tracks[i]];
    }
    return this.tracks;
  }

  get size() {
    return this.tracks.length;
  }

  get first() {
    return this.tracks[0] || null;
  }

  toArray() {
    return [...this.tracks];
  }
}

class MusicPlayer {
  constructor(manager, options = {}) {
    this.manager = manager;
    this.guildId = options.guildId;
    this.voiceChannel = options.voiceChannel;
    this.textChannel = options.textChannel || null;

    this.deaf = Boolean(options.deaf);
    this.mute = Boolean(options.mute);

    this.queue = new PlayerQueue(this);
    this.playing = false;
    this.paused = false;
    this.volume = 100;
    this.current = null;
  }

  async play() {
    if (!this.queue.size) return false;

    const next = this.queue.first;
    if (!next) return false;

    this.current = next;
    this.playing = true;
    this.paused = false;

    if (this.node && next.track) {
      try {
        await this.node.play(this.guildId, next.track, { volume: this.volume });
      } catch (error) {
        this.manager.client.logger.error(`Lavalink play failed: ${error.message}`);
      }
    }

    this.manager.client.logger.info(`Now playing: ${next.title}`);
    this.manager.emit('trackStart', this, next);

    return true;
  }

  async pause() {
    if (!this.playing || this.paused) return false;
    this.paused = true;
    this.manager.emit('trackPause', this, this.current);
    return true;
  }

  async resume() {
    if (!this.playing || !this.paused) return false;
    this.paused = false;
    this.manager.emit('trackResume', this, this.current);
    return true;
  }

  async skip() {
    if (!this.playing) return false;

    const skipped = this.queue.shift();
    this.manager.emit('trackSkip', this, skipped);

    if (this.node) {
      try {
        await this.node.stop(this.guildId);
      } catch (error) {
        this.manager.client.logger.error(`Lavalink stop failed: ${error.message}`);
      }
    }

    if (this.queue.size > 0) {
      await this.play();
      return skipped;
    }

    this.playing = false;
    this.current = null;
    this.manager.emit('queueEnd', this);
    return skipped;
  }

  async stop() {
    this.playing = false;
    this.paused = false;
    this.current = null;
    this.queue.clear();
    this.manager.emit('stop', this);
    return true;
  }

  setVolume(volume) {
    this.volume = Number(volume);
    this.manager.emit('volumeChange', this, this.volume);
    return this.volume;
  }

  async destroy() {
    await this.stop();
    this.manager.players.delete(this.guildId);
    this.manager.queues.delete(this.guildId);
    this.manager.emit('destroy', this);
    return true;
  }
}

MusicManager.Events = {
  TrackStart: 'trackStart',
  TrackPause: 'trackPause',
  TrackResume: 'trackResume',
  TrackSkip: 'trackSkip',
  QueueEnd: 'queueEnd',
  Stop: 'stop',
  Destroy: 'destroy',
  VolumeChange: 'volumeChange'
};

module.exports = MusicManager;
