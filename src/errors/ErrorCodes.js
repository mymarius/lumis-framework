'use strict';

const ErrorCodes = {

  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
  INVALID_TOKEN: 'INVALID_TOKEN',
  INVALID_OPTION: 'INVALID_OPTION',
  MISSING_OPTION: 'MISSING_OPTION',

  CLIENT_NOT_READY: 'CLIENT_NOT_READY',
  CLIENT_ALREADY_LOGGED_IN: 'CLIENT_ALREADY_LOGGED_IN',
  CLIENT_DESTROYED: 'CLIENT_DESTROYED',

  API_ERROR: 'API_ERROR',
  HTTP_ERROR: 'HTTP_ERROR',
  RATE_LIMITED: 'RATE_LIMITED',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',

  WS_CONNECTION_FAILED: 'WS_CONNECTION_FAILED',
  WS_CLOSE_REQUESTED: 'WS_CLOSE_REQUESTED',
  WS_NOT_OPEN: 'WS_NOT_OPEN',
  WS_ALREADY_CONNECTED: 'WS_ALREADY_CONNECTED',
  WS_AUTHENTICATION_FAILED: 'WS_AUTHENTICATION_FAILED',
  WS_INVALID_SESSION: 'WS_INVALID_SESSION',

  CACHE_ADAPTER_ERROR: 'CACHE_ADAPTER_ERROR',
  CACHE_ADAPTER_NOT_FOUND: 'CACHE_ADAPTER_NOT_FOUND',

  PLUGIN_LOAD_ERROR: 'PLUGIN_LOAD_ERROR',
  PLUGIN_NOT_FOUND: 'PLUGIN_NOT_FOUND',
  PLUGIN_ALREADY_LOADED: 'PLUGIN_ALREADY_LOADED',
  PLUGIN_DEPENDENCY_MISSING: 'PLUGIN_DEPENDENCY_MISSING',
  PLUGIN_INVALID: 'PLUGIN_INVALID',

  INVALID_STRUCTURE: 'INVALID_STRUCTURE',
  MISSING_PERMISSIONS: 'MISSING_PERMISSIONS',
  INVALID_CHANNEL_TYPE: 'INVALID_CHANNEL_TYPE',

  LOCALE_NOT_FOUND: 'LOCALE_NOT_FOUND',
  TRANSLATION_KEY_MISSING: 'TRANSLATION_KEY_MISSING',

  INTERACTION_ALREADY_REPLIED: 'INTERACTION_ALREADY_REPLIED',
  INTERACTION_CALLBACK_NOT_FOUND: 'INTERACTION_CALLBACK_NOT_FOUND',
  INTERACTION_NOT_AUTOCOMPLETE: 'INTERACTION_NOT_AUTOCOMPLETE',
};

const ErrorMessages = {
  [ErrorCodes.UNKNOWN_ERROR]: 'Bilinmeyen bir hata oluştu.',
  [ErrorCodes.INVALID_TOKEN]: 'Invalid bot token\'ı sağlandı.',
  [ErrorCodes.INVALID_OPTION]: (option) => `Invalid seçenek: ${option}`,
  [ErrorCodes.MISSING_OPTION]: (option) => `Eksik seçenek: ${option}`,

  [ErrorCodes.CLIENT_NOT_READY]: 'Client henüz hazır değil.',
  [ErrorCodes.CLIENT_ALREADY_LOGGED_IN]: 'Client zaten giriş yapmış.',
  [ErrorCodes.CLIENT_DESTROYED]: 'Client yok edilmiş.',

  [ErrorCodes.API_ERROR]: (code, message) => `Discord API hatası [${code}]: ${message}`,
  [ErrorCodes.HTTP_ERROR]: (status) => `HTTP hatası: ${status}`,
  [ErrorCodes.RATE_LIMITED]: (retryAfter) => `Rate limit aşıldı. ${retryAfter}ms sonra tekrar deneyin.`,
  [ErrorCodes.RATE_LIMIT_EXCEEDED]: 'Maksimum rate limit yeniden deneme sayısına ulaşıldı.',

  [ErrorCodes.WS_CONNECTION_FAILED]: 'WebSocket bağlantısı başarısız oldu.',
  [ErrorCodes.WS_CLOSE_REQUESTED]: 'WebSocket kapatma istendi.',
  [ErrorCodes.WS_NOT_OPEN]: 'WebSocket bağlantısı açık değil.',
  [ErrorCodes.WS_ALREADY_CONNECTED]: 'WebSocket zaten bağlı.',
  [ErrorCodes.WS_AUTHENTICATION_FAILED]: 'WebSocket kimlik doğrulaması başarısız.',
  [ErrorCodes.WS_INVALID_SESSION]: 'Invalid WebSocket oturumu.',

  [ErrorCodes.CACHE_ADAPTER_ERROR]: (msg) => `Cache adaptör hatası: ${msg}`,
  [ErrorCodes.CACHE_ADAPTER_NOT_FOUND]: (name) => `Cache adaptörü not found: ${name}`,

  [ErrorCodes.PLUGIN_LOAD_ERROR]: (name, err) => `Plugin yükleme hatası '${name}': ${err}`,
  [ErrorCodes.PLUGIN_NOT_FOUND]: (name) => `Plugin not found: ${name}`,
  [ErrorCodes.PLUGIN_ALREADY_LOADED]: (name) => `Plugin zaten yüklü: ${name}`,
  [ErrorCodes.PLUGIN_DEPENDENCY_MISSING]: (name, dep) => `Plugin '${name}' bağımlılığı eksik: ${dep}`,
  [ErrorCodes.PLUGIN_INVALID]: (name) => `Invalid plugin: ${name}`,

  [ErrorCodes.INVALID_STRUCTURE]: (name) => `Invalid yapı: ${name}`,
  [ErrorCodes.MISSING_PERMISSIONS]: (perms) => `Eksik yetkiler: ${perms}`,
  [ErrorCodes.INVALID_CHANNEL_TYPE]: (type) => `Invalid kanal türü: ${type}`,

  [ErrorCodes.LOCALE_NOT_FOUND]: (locale) => `Dil not found: ${locale}`,
  [ErrorCodes.TRANSLATION_KEY_MISSING]: (key) => `Çeviri anahtarı not found: ${key}`,

  [ErrorCodes.INTERACTION_ALREADY_REPLIED]: 'İşleme zaten yanıt verildi.',
  [ErrorCodes.INTERACTION_CALLBACK_NOT_FOUND]: 'İşleme yanıtı bulunamadı.',
  [ErrorCodes.INTERACTION_NOT_AUTOCOMPLETE]: 'Bu işlem bir autocomplete işlemi değil.',
};

module.exports = { ErrorCodes, ErrorMessages };
