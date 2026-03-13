'use strict';

const { EventEmitter } = require('node:events');
const { fork } = require('node:child_process');
const path = require('node:path');
const Logger = require('../utils/Logger');
const Collection = require('../utils/Collection');
const { LumisError } = require('../errors/LumisError');

class ShardingManager extends EventEmitter {
  
  constructor(file, options = {}) {
    super();

    this.file = path.resolve(file);
    if (!this.file) throw new Error('ShardingManager için başlatılacak dosya belirtilmedi.');

    this.token = options.token ? options.token.replace(/^Bot\s*/i, '') : null;
    this.totalShards = options.totalShards || 'auto';
    this.execArgv = options.execArgv || [];

    this.shards = new Collection();
    
    this.logger = new Logger({ prefix: 'ShardingManager', level: 'info' });

    this._promises = new Map();
    this._nonce = 0;

    this.maxRespawnAttempts = options.maxRespawnAttempts || 5;
    this.respawns = new Map();
  }

  async fetchRecommendedShards() {
    if (!this.token) throw new Error('Token belirtilmediği için önerilen shard sayısı alınamıyor.');

    const { fetch } = require('undici');
    const res = await fetch('https://discord.com/api/v10/gateway/bot', {
      headers: { Authorization: `Bot ${this.token}` }
    });

    if (!res.ok) throw new Error(`Gateway Error: ${res.statusText}`);
    const data = await res.json();
    return data.shards;
  }

  async spawn() {
    if (this.totalShards === 'auto') {
      this.logger.info('Önerilen shard sayısı Discord API\'den çekiliyor...');
      this.totalShards = await this.fetchRecommendedShards();
      this.logger.info(`Önerilen shard sayısı: ${this.totalShards}`);
    }

    this.logger.info(`${this.totalShards} shard başlatılıyor...`);

    for (let i = 0; i < this.totalShards; i++) {
      this.createShard(i);

      await new Promise(r => setTimeout(r, 5500));
    }
  }

  createShard(id) {
    this.logger.info(`[Shard ${id}] Başlatılıyor...`);

    const env = { 
      ...process.env, 
      SHARD_ID: id, 
      TOTAL_SHARDS: this.totalShards,
      DISCORD_TOKEN: this.token
    };

    const processSpawn = fork(this.file, [], { env, execArgv: this.execArgv });

    this.shards.set(id, processSpawn);

    processSpawn.on('message', (message) => this._handleMessage(processSpawn, message));
    
    processSpawn.on('exit', (code) => {
      const respawnCount = this.respawns.get(id) || 0;
      if (respawnCount >= this.maxRespawnAttempts) {
        this.logger.error(`[Shard ${id}] Maksimum yeniden başlatma sayısına ulaştı (${this.maxRespawnAttempts}). Durduruluyor.`);
        this.emit('shardDeath', id);
        return;
      }

      this.logger.warn(`[Shard ${id}] Beklenmedik şekilde kapandı (Kod: ${code}). Yeniden başlatılıyor (${respawnCount + 1}/${this.maxRespawnAttempts})...`);
      this.shards.delete(id);
      this.respawns.set(id, respawnCount + 1);
      setTimeout(() => this.createShard(id), 5000); // 5sn sonra yeniden başlat
    });

    this.emit('shardCreate', processSpawn, id);
  }

  async broadcastEval(script) {
    const isFunc = typeof script === 'function';
    const scriptStr = isFunc ? `(${script})(this)` : script;
    
    const nonce = Date.now().toString() + (++this._nonce);
    
    const promises = [];

    for (const [id, shard] of this.shards) {
      promises.push(new Promise((resolve, reject) => {
        this._promises.set(`${nonce}_${id}`, { resolve, reject });
        
        shard.send({
          _type: 'BROADCAST_EVAL',
          _nonce: nonce,
          script: scriptStr
        });
      }));
    }

    return Promise.all(promises);
  }

  _handleMessage(shard, message) {
    if (!message || typeof message !== 'object') return;

    if (message._type === 'EVAL_RESULT') {
      const promise = this._promises.get(`${message._nonce}_${message._shardId}`);
      if (!promise) return;

      this._promises.delete(`${message._nonce}_${message._shardId}`);

      if (message._error) {
        promise.reject(new Error(message._error));
      } else {
        promise.resolve(message._result);
      }
    } else if (message._type === 'BROADCAST_REQUIREMENT') {

    } else {

      this.emit('message', shard, message);
    }
  }
}

module.exports = ShardingManager;
