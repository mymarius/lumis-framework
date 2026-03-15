'use strict';

const WebSocket = require('ws');
const { EventEmitter } = require('node:events');
const { setTimeout: sleep } = require('node:timers/promises');
const {
  GATEWAY_URL,
  GatewayOpcodes,
  GatewayCloseCodes,
  RESUMABLE_CLOSE_CODES,
  NON_RECOVERABLE_CLOSE_CODES,
  Events,
} = require('../utils/Constants');
const Logger = require('../utils/Logger');
const { WebSocketError } = require('../errors/LumisError');
const { ErrorCodes } = require('../errors/ErrorCodes');

class WebSocketManager extends EventEmitter {
  
  constructor(client, options = {}) {
    super();

    this.client = client;
    this.logger = new Logger({ prefix: 'WebSocket', level: options.logLevel || 'info' });

    this.ws = null;

    this.sessionId = null;

    this.resumeGatewayUrl = null;

    this.sequence = null;

    this.heartbeatInterval = null;

    this.lastHeartbeatAcked = true;

    this.lastHeartbeatSent = 0;

    this.ping = 0;

    this.status = 'disconnected';

    this.reconnectAttempts = 0;

    this.maxReconnectAttempts = options.maxReconnectAttempts || 10;

    this.token = null;

    this.intents = 0n;
  }

  async connect(token, intents) {
    if (this.status === 'connected') {
      throw new WebSocketError(ErrorCodes.WS_ALREADY_CONNECTED);
    }

    this.token = token;
    this.intents = intents;
    this.status = 'connecting';

    const gatewayUrl = this.resumeGatewayUrl || GATEWAY_URL;
    this.logger.info(`Gateway'e bağlanılıyor: ${gatewayUrl}`);

    try {
      this.ws = new WebSocket(gatewayUrl);

      this.ws.on('open', () => this._onOpen());
      this.ws.on('message', (data) => this._onMessage(data));
      this.ws.on('close', (code, reason) => this._onClose(code, reason));
      this.ws.on('error', (error) => this._onError(error));
    } catch (error) {
      this.status = 'disconnected';
      throw new WebSocketError(ErrorCodes.WS_CONNECTION_FAILED, null, error.message);
    }
  }

  _onOpen() {
    this.logger.info('WebSocket bağlantısı açıldı.');
    this.reconnectAttempts = 0;
  }

  _onMessage(data) {
    let payload;
    try {
      payload = JSON.parse(data.toString());
    } catch {
      this.logger.error('Gateway mesajı parse edilemedi.');
      return;
    }

    const { op, d, s, t } = payload;

    if (s !== null) {
      this.sequence = s;
    }

    switch (op) {
      case GatewayOpcodes.DISPATCH:
        this._handleDispatch(t, d);
        break;

      case GatewayOpcodes.HEARTBEAT:
        this._sendHeartbeat();
        break;

      case GatewayOpcodes.RECONNECT:
        this.logger.info('Gateway RECONNECT istedi.');
        this._reconnect();
        break;

      case GatewayOpcodes.INVALID_SESSION:
        this.logger.warn(`Invalid oturum. Resumable: ${d}`);
        this._handleInvalidSession(d);
        break;

      case GatewayOpcodes.HELLO:
        this._handleHello(d);
        break;

      case GatewayOpcodes.HEARTBEAT_ACK:
        this._handleHeartbeatAck();
        break;

      default:
        this.logger.debug(`Bilinmeyen opcode: ${op}`);
    }
  }

  _handleHello(data) {
    const { heartbeat_interval } = data;

    this.logger.info(`Hello alındı. Heartbeat aralığı: ${heartbeat_interval}ms`);

    this._startHeartbeat(heartbeat_interval);

    const jitter = Math.random() * heartbeat_interval;
    setTimeout(() => this._sendHeartbeat(), jitter);

    if (this.sessionId && this.sequence !== null) {
      this._sendResume();
    } else {
      this._sendIdentify();
    }
  }

  _handleDispatch(eventName, data) {
    this.logger.debug(`Dispatch: ${eventName}`);

    switch (eventName) {
      case 'READY':
        this.sessionId = data.session_id;
        this.resumeGatewayUrl = data.resume_gateway_url
          ? `${data.resume_gateway_url}/?v=10&encoding=json`
          : null;
        this.status = 'connected';
        this.logger.info(`Hazır! Session: ${this.sessionId}`);
        break;

      case 'RESUMED':
        this.status = 'connected';
        this.logger.info('Oturum devam ettirildi (resumed).');
        break;
    }

    this.emit('dispatch', eventName, data);
  }

  async _handleInvalidSession(resumable) {
    if (resumable) {
      await sleep(1000 + Math.random() * 4000);
      this._sendResume();
    } else {
      this.sessionId = null;
      this.sequence = null;
      this.resumeGatewayUrl = null;
      await sleep(1000 + Math.random() * 4000);
      this._reconnect();
    }
  }

  _handleHeartbeatAck() {
    this.lastHeartbeatAcked = true;
    this.ping = Date.now() - this.lastHeartbeatSent;
    this.logger.debug(`Heartbeat ACK. Ping: ${this.ping}ms`);
  }

  _sendHeartbeat() {
    if (!this.lastHeartbeatAcked) {
      this.logger.warn('Son heartbeat ACK alınmadı! Zombie bağlantı, yeniden bağlanılıyor...');
      this._reconnect();
      return;
    }

    this.lastHeartbeatAcked = false;
    this.lastHeartbeatSent = Date.now();

    this._send({
      op: GatewayOpcodes.HEARTBEAT,
      d: this.sequence,
    });
  }

  _startHeartbeat(interval) {
    this._stopHeartbeat();
    this.heartbeatInterval = setInterval(() => this._sendHeartbeat(), interval);
  }

  _stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  _sendIdentify() {
    this.logger.info('IDENTIFY gönderiliyor...');

    this._send({
      op: GatewayOpcodes.IDENTIFY,
      d: {
        token: this.token,
        intents: Number(this.intents),
        properties: {
          os: process.platform,
          browser: 'lumis',
          device: 'lumis',
        },
        large_threshold: 250,
      },
    });
  }

  _sendResume() {
    this.logger.info('RESUME gönderiliyor...');
    this.status = 'resuming';

    this._send({
      op: GatewayOpcodes.RESUME,
      d: {
        token: this.token,
        session_id: this.sessionId,
        seq: this.sequence,
      },
    });
  }

  _send(data) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      this.logger.warn('WebSocket açık değil, veri gönderilemedi.');
      return;
    }

    this.ws.send(JSON.stringify(data));
  }

  async _reconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.logger.error(`Maximum reconnection attempts reached (${this.maxReconnectAttempts}).`);
      this.emit('disconnect', 'Max reconnect attempts reached');
      return;
    }

    this.reconnectAttempts++;
    this.status = 'reconnecting';

    this._cleanup();

    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts - 1), 30000);
    this.logger.info(`Reconnection attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts}. Waiting ${delay}ms...`);

    this.emit('reconnecting', this.reconnectAttempts);
    await sleep(delay);

    try {
      await this.connect(this.token, this.intents);
    } catch (error) {
      this.logger.error('Reconnection failed:', error.message);
      this._reconnect();
    }
  }

  _onClose(code, reason) {
    const reasonStr = reason?.toString() || 'Unknown';
    this.logger.warn(`WebSocket closed. Code: ${code}, Reason: ${reasonStr}`);

    this._cleanup();

    if (NON_RECOVERABLE_CLOSE_CODES.has(code)) {
      this.logger.error(`Non-recoverable close code: ${code}. Will not reconnect.`);
      this.status = 'disconnected';
      this.sessionId = null;
      this.sequence = null;
      this.emit('disconnect', `Non-recoverable close code: ${code}`);
      return;
    }

    if (!RESUMABLE_CLOSE_CODES.has(code)) {
      this.sessionId = null;
      this.sequence = null;
    }

    this._reconnect();
  }

  _onError(error) {
    this.logger.error('WebSocket error:', error.message);
    this.emit('error', error);
  }

  _cleanup() {
    this._stopHeartbeat();
    this.lastHeartbeatAcked = true;

    if (this.ws) {
      this.ws.removeAllListeners();
      try {
        this.ws.close(1000);
      } catch {}
      this.ws = null;
    }
  }

  setPresence(presence) {
    this._send({
      op: GatewayOpcodes.PRESENCE_UPDATE,
      d: {
        since: presence.status === 'idle' ? Date.now() : null,
        activities: presence.activities || [],
        status: presence.status || 'online',
        afk: presence.afk || false,
      },
    });
  }

  destroy() {
    this.logger.info('WebSocket destroying...');
    this.status = 'disconnected';
    this._cleanup();
    this.sessionId = null;
    this.sequence = null;
    this.resumeGatewayUrl = null;
    this.token = null;
  }
}

module.exports = WebSocketManager;
