import { CacheBase } from '@tryghost/adapter-base-cache';

declare class AdapterCacheMemoryTTL<Value = unknown> extends CacheBase {
  constructor(options?: { max?: number; ttl?: number });
  get(key: string): Value | undefined;
  set(key: string, value: Value, options?: { ttl?: number }): void;
  reset(): void;
  keys(): string[];
}

export = AdapterCacheMemoryTTL;
