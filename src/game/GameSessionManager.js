'use strict';

const Collection = require('../utils/Collection');
const { EventEmitter } = require('node:events');

class GameSessionManager extends EventEmitter {
  constructor() {
    super();

    this.sessions = new Collection();
  }

  startSession(sessionId, initialData = {}, timeoutMs = 300000) {
    if (this.sessions.has(sessionId)) {
      this.endSession(sessionId, 'force_restart');
    }

    const session = {
      id: sessionId,
      data: initialData,
      startTime: Date.now(),
      lastActivityTime: Date.now(),
      timeoutMs,
      _timer: null
    };

    this.sessions.set(sessionId, session);
    this._resetTimer(session);

    this.emit('sessionStart', session);
    return session;
  }

  getSession(sessionId) {
    return this.sessions.get(sessionId) || null;
  }

  updateSession(sessionId, newData) {
    const session = this.sessions.get(sessionId);
    if (!session) return null;

    Object.assign(session.data, newData);
    session.lastActivityTime = Date.now();
    
    this._resetTimer(session);
    this.emit('sessionUpdate', session);
    return session;
  }

  endSession(sessionId, reason = 'finished') {
    const session = this.sessions.get(sessionId);
    if (!session) return false;

    if (session._timer) {
      clearTimeout(session._timer);
    }

    this.sessions.delete(sessionId);
    this.emit('sessionEnd', session, reason);
    return true;
  }

  _resetTimer(session) {
    if (session._timer) {
      clearTimeout(session._timer);
    }

    if (session.timeoutMs > 0) {
      session._timer = setTimeout(() => {
        this.endSession(session.id, 'timeout');
      }, session.timeoutMs).unref();
    }
  }
}

module.exports = GameSessionManager;
