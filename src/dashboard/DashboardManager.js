'use strict';

const http = require('http');
const { URL } = require('url');

/**
 * Built-in Dashboard & Analytics API.
 * Provides an HTTP REST API + real-time metrics for monitoring your bot.
 * 
 * @example
 * const client = new Client({
 *   dashboard: { enabled: true, port: 3000, auth: 'my-secret-key' }
 * });
 * // GET /api/stats
 * // GET /api/guilds
 * // GET /api/commands
 * // GET /api/health
 * // GET /api/cache
 * // GET /api/plugins
 * // GET /api/services
 * // GET /api/middleware
 */
class DashboardManager {
  constructor(client, options = {}) {
    this.client = client;
    this.options = {
      enabled: options.enabled || false,
      port: options.port || 3000,
      host: options.host || '0.0.0.0',
      auth: options.auth || null,
      cors: options.cors !== false,
      ...options,
    };

    /** @type {http.Server|null} */
    this._server = null;

    /** @type {Map<string, number>} Command usage counters */
    this._commandUsage = new Map();

    /** @type {Array} Recent errors */
    this._recentErrors = [];

    /** @type {number} */
    this._requestCount = 0;

    /** @type {Map<string, Function>} Custom API routes */
    this._customRoutes = new Map();

    // Track command usage
    this._trackUsage();

    // Auto-start if enabled
    if (this.options.enabled) {
      this.client.on?.('ready', () => this.start());
    }
  }

  /**
   * Start the dashboard HTTP server.
   * @returns {Promise<void>}
   */
  async start() {
    if (this._server) return;

    this._server = http.createServer((req, res) => {
      this._handleRequest(req, res);
    });

    return new Promise((resolve, reject) => {
      this._server.listen(this.options.port, this.options.host, () => {
        this.client.logger?.info(`📊 Dashboard running at http://localhost:${this.options.port}`);
        resolve();
      });

      this._server.on('error', (err) => {
        this.client.logger?.error('Dashboard server error:', err.message);
        reject(err);
      });
    });
  }

  /**
   * Stop the dashboard server.
   */
  async stop() {
    if (!this._server) return;
    return new Promise((resolve) => {
      this._server.close(() => {
        this._server = null;
        resolve();
      });
    });
  }

  /**
   * Register a custom API route.
   * @param {string} path - e.g. '/api/custom'
   * @param {Function} handler - (req, res, client) => void
   */
  route(path, handler) {
    this._customRoutes.set(path, handler);
    return this;
  }

  /** @private */
  _handleRequest(req, res) {
    this._requestCount++;

    // CORS
    if (this.options.cors) {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
      }
    }

    // Auth
    if (this.options.auth) {
      const authHeader = req.headers.authorization;
      if (!authHeader || authHeader !== `Bearer ${this.options.auth}`) {
        this._json(res, 401, { error: 'Unauthorized' });
        return;
      }
    }

    const url = new URL(req.url, `http://${req.headers.host}`);
    const pathname = url.pathname;

    // Custom routes first
    if (this._customRoutes.has(pathname)) {
      try {
        this._customRoutes.get(pathname)(req, res, this.client);
      } catch (err) {
        this._json(res, 500, { error: err.message });
      }
      return;
    }

    // Built-in routes
    switch (pathname) {
      case '/api/stats':
        return this._routeStats(res);
      case '/api/guilds':
        return this._routeGuilds(res);
      case '/api/commands':
        return this._routeCommands(res);
      case '/api/health':
        return this._routeHealth(res);
      case '/api/cache':
        return this._routeCache(res);
      case '/api/plugins':
        return this._routePlugins(res);
      case '/api/services':
        return this._routeServices(res);
      case '/api/middleware':
        return this._routeMiddleware(res);
      case '/api/errors':
        return this._routeErrors(res);
      default:
        this._json(res, 404, { error: 'Not Found', availableRoutes: [
          '/api/stats', '/api/guilds', '/api/commands', '/api/health',
          '/api/cache', '/api/plugins', '/api/services', '/api/middleware',
          '/api/errors',
        ]});
    }
  }

  /** @private */
  _routeStats(res) {
    const memUsage = process.memoryUsage();

    this._json(res, 200, {
      bot: {
        user: this.client.user ? {
          id: this.client.user.id,
          tag: this.client.user.tag,
          avatar: this.client.user.avatar,
        } : null,
        uptime: this.client.uptime,
        uptimeFormatted: this._formatUptime(this.client.uptime),
        ping: this.client.ping,
        ready: this.client.ready,
        readyAt: this.client.readyAt,
      },
      counts: {
        guilds: this.client.guilds?.size || 0,
        channels: this.client.channels?.size || 0,
        users: this.client.users?.size || 0,
        commands: this.client.commands?.commands?.size || 0,
      },
      memory: {
        rss: Math.round(memUsage.rss / 1024 / 1024) + 'MB',
        heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024) + 'MB',
        heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024) + 'MB',
      },
      system: {
        nodeVersion: process.version,
        platform: process.platform,
        pid: process.pid,
      },
      shard: this.client.shard || null,
      dashboard: {
        requests: this._requestCount,
      }
    });
  }

  /** @private */
  _routeGuilds(res) {
    const guilds = [];
    if (this.client.guilds) {
      for (const [id, guild] of this.client.guilds) {
        guilds.push({
          id,
          name: guild.name,
          memberCount: guild.memberCount,
          icon: guild.icon,
          ownerId: guild.ownerId,
        });
      }
    }
    this._json(res, 200, { total: guilds.length, guilds });
  }

  /** @private */
  _routeCommands(res) {
    const commands = [];
    if (this.client.commands?.commands) {
      for (const [name, cmd] of this.client.commands.commands) {
        commands.push({
          name,
          description: cmd.description || '',
          cooldown: cmd.cooldown || 0,
          guards: cmd.guards?.map(g => g.name) || [],
          usage: this._commandUsage.get(name) || 0,
        });
      }
    }
    this._json(res, 200, { total: commands.length, commands });
  }

  /** @private */
  _routeHealth(res) {
    const healthy = this.client.ready && this.client.ws?.connected !== false;
    this._json(res, healthy ? 200 : 503, {
      status: healthy ? 'healthy' : 'unhealthy',
      ready: this.client.ready,
      uptime: this.client.uptime,
      ping: this.client.ping,
      timestamp: new Date().toISOString(),
    });
  }

  /** @private */
  _routeCache(res) {
    this._json(res, 200, {
      guilds: this.client.guilds?.size || 0,
      channels: this.client.channels?.size || 0,
      users: this.client.users?.size || 0,
      adapter: this.client.cache?.adapter?.constructor?.name || 'unknown',
    });
  }

  /** @private */
  _routePlugins(res) {
    const plugins = this.client.plugins?.list?.() || [];
    this._json(res, 200, { total: plugins.length, plugins });
  }

  /** @private */
  _routeServices(res) {
    const services = this.client.services?.list?.() || [];
    this._json(res, 200, { total: services.length, services });
  }

  /** @private */
  _routeMiddleware(res) {
    const stats = this.client.middleware?.stats || { global: 0, command: 0, group: 0, total: 0 };
    this._json(res, 200, stats);
  }

  /** @private */
  _routeErrors(res) {
    this._json(res, 200, { 
      total: this._recentErrors.length, 
      errors: this._recentErrors.slice(-50)
    });
  }

  /** @private */
  _trackUsage() {
    this.client.on?.('interactionCreate', (interaction) => {
      if (interaction?.commandName) {
        const current = this._commandUsage.get(interaction.commandName) || 0;
        this._commandUsage.set(interaction.commandName, current + 1);
      }
    });

    this.client.on?.('error', (error) => {
      this._recentErrors.push({
        message: error?.message || String(error),
        timestamp: new Date().toISOString(),
      });
      if (this._recentErrors.length > 100) {
        this._recentErrors = this._recentErrors.slice(-100);
      }
    });
  }

  /** @private */
  _json(res, status, data) {
    res.writeHead(status, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(data, null, 2));
  }

  /** @private */
  _formatUptime(ms) {
    if (!ms) return '0s';
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    const parts = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours % 24 > 0) parts.push(`${hours % 24}h`);
    if (minutes % 60 > 0) parts.push(`${minutes % 60}m`);
    if (seconds % 60 > 0) parts.push(`${seconds % 60}s`);
    return parts.join(' ') || '0s';
  }

  /**
   * Destroy the dashboard.
   */
  async destroy() {
    await this.stop();
    this._commandUsage.clear();
    this._recentErrors = [];
    this._customRoutes.clear();
  }
}

module.exports = DashboardManager;
