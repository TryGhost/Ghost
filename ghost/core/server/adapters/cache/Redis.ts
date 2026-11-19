/**
 * Filename must match the adapter name specified in config (adapters.cache.active: "Redis").
 * The adapter-manager loads adapters by constructing a path from the config value.
 *
 * @see core/shared/config/defaults.json
 * @see foundry/src/adapter-manager/loader.ts
 */
export { default } from '../lib/redis/AdapterCacheRedis';
