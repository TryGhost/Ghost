/**
 * Filename must match the adapter name specified in config (adapters.cache.active: "Redis").
 * The adapter-manager loads adapters by constructing a path from the config value.
 *
 * @see core/shared/config/defaults.json
 * @see core/server/services/adapter-manager/adapter-manager.js
 */
/* eslint-disable ghost/filenames/match-regex */
const RedisCache = require('../lib/redis/AdapterCacheRedis');

module.exports = RedisCache;
