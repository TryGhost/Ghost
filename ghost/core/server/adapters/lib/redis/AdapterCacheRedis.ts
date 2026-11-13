import crypto from 'node:crypto';
import { z } from 'zod';
import { CacheBase } from '@tryghost/adapter-base-cache';
import * as errors from '@tryghost/errors';
import logging from '@tryghost/logging';
import metrics from '@tryghost/metrics';
import createDebug from '@tryghost/debug';
import cacheManager from 'cache-manager';
import { redisConnection } from '../../../../shared/config/schema/redis';
import redisStoreFactory from './redis-store-factory';

const debug = createDebug('redis-cache');

const PREFIX_HASH_KEY = 'prefix_hash';

/** The parts of the ioredis client this adapter uses. */
interface RedisClient {
  on(event: 'error', listener: (error: Error) => void): unknown;
  get(key: string): Promise<string | null>;
  set(key: string, value: string, mode?: 'NX'): Promise<'OK' | null>;
}

/** The parts of a cache-manager cache over a Redis store this adapter uses. */
interface RedisCacheManager {
  store: { getClient(): RedisClient };
  get(key: string): Promise<unknown>;
  set(key: string, value: unknown, options?: { ttl: number }): Promise<unknown>;
  ttl(key: string): Promise<number>;
}

const plainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/**
 * Connection keys come from the shared Redis connection schema, so any other
 * top-level key passes through to ioredis.
 */
const configSchema = redisConnection.extend({
  /** A cache-manager cache to use instead of connecting; tests inject one. */
  cache: z
    .custom<RedisCacheManager>(
      (value) =>
        plainObject(value) &&
        plainObject(value.store) &&
        typeof value.store.getClient === 'function',
      { error: 'Must be a cache-manager cache over a Redis store' },
    )
    .optional(),
  /** Default time to live in seconds. */
  ttl: z.number().nonnegative().nullish(),
  /** Read timeout in milliseconds, after which a read counts as a miss. */
  getTimeoutMilliseconds: z.number().nonnegative().nullish(),
  /** How far through its ttl an entry is refreshed in the background, from 0 to 1. */
  refreshAheadFactor: z.number().min(0).max(1).nullish(),
  /** Prefix for every key, e.g. `2368:image-sizes:`. */
  keyPrefix: z.string().nullish(),
  /** Feature name added to metrics, e.g. `postsPublic`. */
  featureName: z.string().nullish(),
  /** Share one Redis store across every adapter in the process. Defaults to true. */
  reuseConnection: z.boolean().nullish(),
  /** cache-manager-ioredis cluster config. Passed through as given. */
  clusterConfig: z.custom<Record<string, unknown>>(plainObject).nullish(),
  /** Extra ioredis options, applied over the top-level ones, so checked the same way. */
  storeConfig: redisConnection
    .extend({
      /** Seconds between reconnect attempts. Defaults to 10. */
      retryConnectSeconds: z.number().positive().nullish(),
    })
    .nullish(),
});

export type AdapterCacheRedisOptions = z.input<typeof configSchema>;

export default class AdapterCacheRedis extends CacheBase {
  cache: RedisCacheManager;
  ttl: number | null | undefined;
  refreshAheadFactor: number;
  getTimeoutMilliseconds: number | null;
  currentlyExecutingBackgroundRefreshes: Set<string>;
  currentlyExecutingReads: Map<string, Promise<unknown>>;
  private _keyPrefix: string;
  private _featureName: string | null | undefined;
  private _prefixHashInitInFlight: Promise<string | null> | null;

  /**
   * Parse the adapter's config, throwing an IncorrectUsageError naming every
   * bad key. Shared by `validate` (boot) and the constructor.
   */
  private static parseConfig(config: unknown) {
    const result = configSchema.safeParse(config ?? {});
    if (!result.success) {
      throw new errors.IncorrectUsageError({
        message: result.error.issues
          .map((issue) => `${issue.path.join('.') || 'config'}: ${issue.message}`)
          .join('; '),
      });
    }
    return result.data;
  }

  /** Validate the options this adapter would be constructed with, without connecting. */
  static validate(config: unknown): asserts config is AdapterCacheRedisOptions {
    AdapterCacheRedis.parseConfig(config);
  }

  constructor(config?: unknown) {
    super();

    const {
      cache,
      ttl,
      getTimeoutMilliseconds,
      refreshAheadFactor,
      keyPrefix,
      featureName,
      reuseConnection,
      clusterConfig,
      storeConfig,
      ...connection
    } = AdapterCacheRedis.parseConfig(config);

    if (cache) {
      this.cache = cache;
    } else {
      const storeOptions = {
        ttl,
        ...connection,
        retryStrategy: () => {
          return (storeConfig?.retryConnectSeconds || 10) * 1000;
        },
        ...storeConfig,
        clusterConfig,
      };
      const store = redisStoreFactory.getRedisStore(storeOptions, reuseConnection ?? true);

      this.cache = cacheManager.caching({
        store: store,
        ...storeOptions,
      });
    }

    this.ttl = ttl;
    this.refreshAheadFactor = refreshAheadFactor || 0;
    this.getTimeoutMilliseconds = getTimeoutMilliseconds || null;
    this.currentlyExecutingBackgroundRefreshes = new Set();
    this.currentlyExecutingReads = new Map();
    this._keyPrefix = keyPrefix || '';
    this._featureName = featureName;
    this._prefixHashInitInFlight = null;
    this.redisClient.on('error', this.handleRedisError);
  }

  /**
   * Underscore-private to survive api-framework's `_.cloneDeep` on the
   * controller (and this adapter). See the "survives deep cloning"
   * suite — `#`-private methods break on clones.
   */
  private _metric(name: string, extra: Record<string, unknown> = {}) {
    const value: Record<string, unknown> = { ...extra };
    if (this._featureName !== undefined && this._featureName !== null) {
      value.feature = this._featureName;
    }
    metrics.metric(name, value);
  }

  /**
   * api-framework's pipeline _.cloneDeep's controllers (and the cache
   * adapter alongside them). Caching the redis client as `this.redisClient`
   * was breaking on clones because the cloned ioredis instance has the
   * prototype but no live socket. Going through cache-manager's
   * `store.getClient()` works because that function captures the original
   * client via closure, so even on a clone it returns the live one.
   */
  get redisClient(): RedisClient {
    return this.cache.store.getClient();
  }

  /**
   * NOTE: this adds an extra round-trip to every cache operation. The
   * trade-off is intentional for now (reset becomes O(1) instead of an
   * O(n) SCAN).
   *
   * NOTE: the prefix_hash key is written without a TTL, but redis can
   * still evict it under allkeys-lru / allkeys-random eviction policies.
   * Eviction will silently invalidate the entire cache as a side effect.
   * Operators who need stricter invalidation guarantees should configure
   * a noeviction policy or pin this key out-of-band.
   */
  async prefixHash() {
    const currentPrefixHash = await this.redisClient.get(this._keyPrefix + PREFIX_HASH_KEY);
    if (currentPrefixHash) {
      return currentPrefixHash;
    }
    return this._initPrefixHash();
  }

  /**
   * Lazily creates the prefix_hash. Concurrent callers in this process
   * share one in-flight init via _prefixHashInitInFlight; SET NX ensures
   * only one writer wins across processes.
   */
  _initPrefixHash() {
    if (this._prefixHashInitInFlight) {
      return this._prefixHashInitInFlight;
    }
    const value = crypto.randomBytes(12).toString('hex');
    this._prefixHashInitInFlight = this.redisClient
      .set(this._keyPrefix + PREFIX_HASH_KEY, value, 'NX')
      .then(async (result) => {
        if (result === 'OK') {
          return value;
        }
        // someone else wrote it first; return their value
        return await this.redisClient.get(this._keyPrefix + PREFIX_HASH_KEY);
      })
      .finally(() => {
        this._prefixHashInitInFlight = null;
      });
    return this._prefixHashInitInFlight;
  }

  async keyPrefix() {
    const prefixHash = await this.prefixHash();
    return this._keyPrefix + prefixHash;
  }

  handleRedisError(error: Error) {
    logging.error(error);
  }

  /**
   * This is a recommended way to build cache key prefixes from
   * the cache-manager package. Might be a good contribution to make
   * in the package itself (https://github.com/node-cache-manager/node-cache-manager/issues/158)
   */
  async _buildKey(key: string): Promise<string> {
    const keyPrefix = await this.keyPrefix();
    return `${keyPrefix}${key}`;
  }

  /**
   * Write through cache-manager with this adapter's own TTL. The TTL must be
   * passed per-call: with `reuseConnection` (the default) every Redis cache
   * adapter in the process shares one store, and the store-level TTL is
   * whatever the first-instantiated adapter was configured with — so relying
   * on it would silently apply that adapter's TTL to every feature.
   */
  async _cacheSet(internalKey: string, value: unknown) {
    if (typeof this.ttl === 'number') {
      return await this.cache.set(internalKey, value, { ttl: this.ttl });
    }
    return await this.cache.set(internalKey, value);
  }

  async shouldRefresh(internalKey: string) {
    if (this.refreshAheadFactor === 0) {
      debug(`shouldRefresh ${internalKey}: false - refreshAheadFactor = 0`);
      return false;
    }
    if (this.refreshAheadFactor === 1) {
      debug(`shouldRefresh ${internalKey}: true - refreshAheadFactor = 1`);
      return true;
    }
    try {
      const ttlRemainingForEntry = await this.cache.ttl(internalKey);
      const shouldRefresh = ttlRemainingForEntry < this.refreshAheadFactor * (this.ttl ?? NaN);
      debug(
        `shouldRefresh ${internalKey}: ${shouldRefresh} - TTL remaining = ${ttlRemainingForEntry}`,
      );
      return shouldRefresh;
    } catch (err) {
      logging.error(err);
      return false;
    }
  }

  /**
   * Performs the buildKey + cache.get sequence, bounded by
   * getTimeoutMilliseconds if configured. On timeout resolves with
   * {internalKey: null, result: null} so the caller treats it as a MISS.
   */
  _lookupWithTimeout(key: string): Promise<{ internalKey: string | null; result: unknown }> {
    const lookup = (async () => {
      const internalKey = await this._buildKey(key);
      const result = await this.cache.get(internalKey);
      return { internalKey, result };
    })();

    const timeoutMs = this.getTimeoutMilliseconds;
    if (typeof timeoutMs !== 'number') {
      return lookup;
    }

    return new Promise((resolve) => {
      // `lookup` keeps running after the timer fires, so without a
      // single-settlement guard a slow failing redis read would emit
      // both `cache-timeout` and `cache-error` for the same request.
      let settled = false;
      const timer = setTimeout(() => {
        if (settled) {
          return;
        }
        settled = true;
        debug('get', key, 'timeout');
        this._metric('cache-timeout');
        resolve({ internalKey: null, result: null });
      }, timeoutMs);
      lookup.then(
        (value) => {
          if (settled) {
            return;
          }
          settled = true;
          clearTimeout(timer);
          resolve(value);
        },
        (err) => {
          if (settled) {
            return;
          }
          settled = true;
          clearTimeout(timer);
          // redis failure during lookup - treat as MISS, same as the timeout path
          this._metric('cache-error', { operation: 'get' });
          logging.error(err);
          resolve({ internalKey: null, result: null });
        },
      );
    });
  }

  /**
   * @param fetchData An optional function to fetch the data, which will be used in the case of a cache MISS or a background refresh
   */
  async get(key: string, fetchData?: () => Promise<unknown>): Promise<unknown> {
    try {
      const { internalKey, result } = await this._lookupWithTimeout(key);
      debug(`get ${key}: Cache ${result ? 'HIT' : 'MISS'}`);
      if (result) {
        this._metric('cache-hit');
      } else if (internalKey !== null) {
        // A real miss; timeouts and lookup errors (internalKey === null)
        // already emitted their own metric in `_lookupWithTimeout`.
        this._metric('cache-miss');
      }
      if (!fetchData) {
        return result;
      }
      if (result) {
        // a hit always came through a lookup that built its key
        const hitKey = internalKey as string;
        const shouldRefresh = await this.shouldRefresh(hitKey);
        const isRefreshing = this.currentlyExecutingBackgroundRefreshes.has(hitKey);
        if (isRefreshing) {
          debug(`Background refresh already happening for ${key}`);
        }
        if (!isRefreshing && shouldRefresh) {
          debug(`Doing background refresh for ${key}`);
          this.currentlyExecutingBackgroundRefreshes.add(hitKey);
          this._metric('cache-background-refresh-triggered');
          const refreshStart = performance.now();
          fetchData()
            .then(async (data) => {
              await this.set(key, data, { throwOnError: true }); // We don't use `internalKey` here because `set` handles it
              this.currentlyExecutingBackgroundRefreshes.delete(hitKey);
              this._metric('cache-background-refresh-succeeded', {
                value: performance.now() - refreshStart,
              });
            })
            .catch((error) => {
              this.currentlyExecutingBackgroundRefreshes.delete(hitKey);
              this._metric('cache-background-refresh-failed');
              logging.error({
                message: 'There was an error refreshing cache data in the background',
                error: error,
              });
            });
        }
        return result;
      } else {
        if (!internalKey) {
          return fetchData();
        }
        if (this.currentlyExecutingReads.has(internalKey)) {
          return this.currentlyExecutingReads.get(internalKey);
        }
        const fetchPromise = fetchData();
        const resultPromise = fetchPromise.catch((err) => {
          logging.error(err);
        });
        fetchPromise
          .then(async (data) => {
            try {
              debug('set', internalKey);
              await this._cacheSet(internalKey, data);
            } catch (err) {
              this._metric('cache-error', { operation: 'set' });
              logging.error(err);
            }
          })
          .catch(() => {
            // fetchData rejection — already logged by resultPromise
          })
          .finally(() => {
            this.currentlyExecutingReads.delete(internalKey);
          });
        this.currentlyExecutingReads.set(internalKey, resultPromise);
        return resultPromise;
      }
    } catch (err) {
      this._metric('cache-error', { operation: 'get' });
      logging.error(err);
    }
  }

  /**
   * @param options.throwOnError if true, rethrow write errors after logging. Used by the background refresh path so success is only emitted after a write that actually succeeded.
   */
  async set(key: string, value: unknown, { throwOnError = false } = {}) {
    try {
      const internalKey = await this._buildKey(key);
      debug('set', internalKey);
      return await this._cacheSet(internalKey, value);
    } catch (err) {
      this._metric('cache-error', { operation: 'set' });
      logging.error(err);
      if (throwOnError) {
        throw err;
      }
    }
  }

  async cyclePrefixHash() {
    const value = crypto.randomBytes(12).toString('hex');
    // Raw client: cache-manager would JSON-wrap, and reset needs an unconditional overwrite (no NX).
    await this.redisClient.set(this._keyPrefix + PREFIX_HASH_KEY, value);
    return value;
  }

  async reset() {
    debug('reset');
    const t0 = performance.now();
    try {
      await this.cyclePrefixHash();
      this._metric('cache-reset', { value: performance.now() - t0 });
    } catch (err) {
      this._metric('cache-error', { operation: 'reset' });
      logging.error(err);
    }
  }

  /**
   * @deprecated The cache adapter interface still requires a `keys` method
   *             (see @tryghost/adapter-base-cache#requiredFns), but the
   *             redis adapter does not support enumerating its keys.
   */
  keys(): never {
    throw new errors.IncorrectUsageError({
      message: 'AdapterCacheRedis does not support keys()',
    });
  }
}
