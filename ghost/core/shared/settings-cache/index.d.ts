import type { EventEmitter } from 'node:events';

interface CachedSetting {
  key: string;
  value: unknown;
  type?: string;
  is_read_only?: boolean;
  [key: string]: unknown;
}

interface CacheStore {
  get(key: string): CachedSetting | undefined;
  set(key: string, value: CachedSetting): void;
  keys(): string[];
  reset(): void;
}

interface SettingModel {
  get(key: 'key'): string;
  toJSON(): CachedSetting;
}

interface CalculatedField {
  key: string;
  dependents: string[];
  getSetting(): CachedSetting;
}

interface SettingsCache {
  // Resolved settings can contain parsed JSON. Callers must validate their shape.
  get(key: string, options: { resolve: false }): CachedSetting | undefined;
  get(key: string, options?: { resolve?: boolean }): unknown;
  set(key: string, value: CachedSetting): void;
  getAll(): Record<string, CachedSetting>;
  getPublic(): Record<string, unknown>;
  init(
    events: EventEmitter,
    settingsCollection: { models: SettingModel[] } | null,
    calculatedFields: CalculatedField[],
    cacheStore: CacheStore,
    settingsOverrides?: Record<string, unknown>,
  ): CacheStore;
  reset(events: EventEmitter): void;
}

declare const settingsCache: SettingsCache;
export = settingsCache;
