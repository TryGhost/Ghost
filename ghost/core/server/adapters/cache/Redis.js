/**
 * Filename must match the adapter name specified in config (adapters.cache.active: "Redis").
 * The adapter-manager loads adapters by constructing a path from the config value.
 *
 * @see core/shared/config/defaults.json
 * @see core/kernel/adapter-manager/loader.ts
 */
const RedisCache = require('../lib/redis/AdapterCacheRedis');

module.exports = RedisCache;
