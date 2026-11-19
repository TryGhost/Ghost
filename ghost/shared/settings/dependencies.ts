import type { EventEmitter } from 'node:events';
import type { Foundation } from '@tryghost/kernel/foundation';
import type { LimitService } from '@tryghost/limit-service';

/** A settings row as the model returns it. */
interface SettingRow {
  get(key: 'value'): unknown;
}

/**
 * What settings still takes from legacy Core, because it is neither part of
 * the foundation nor a shared module yet. Each member is a reason settings is
 * not fully a shared module; `transition/settings` supplies them.
 */
export interface SettingsTransition {
  /** The Bookshelf model: one registry per process, defined against one database handle. */
  readonly SettingsModel: {
    populateDefaults(): Promise<unknown>;
    findAll(options: object): Promise<{ length?: unknown } | null>;
    findOne(where: { key: string }, options: object): Promise<SettingRow | null | undefined>;
    edit(settings: { key: string; value: unknown }[], options: object): Promise<unknown>;
  };
  /**
   * The settings cache. It is built when `core/shared/settings-cache` is first
   * imported, and several hundred files hold it from that moment.
   */
  readonly cache: {
    get(key: string): unknown;
    init(
      events: EventEmitter,
      settings: unknown,
      calculatedFields: readonly unknown[],
      cacheStore: unknown,
      overrides: Record<string, unknown>,
    ): unknown;
  };
  /** The emitter models announce edits on. Not the foundation's event bus. */
  readonly events: EventEmitter;
  /** The cache adapter the site configured. Adapters are not handed out to shared modules. */
  cacheStore(): unknown;
  /** Settings worked out from other settings, config, labs and limits: product knowledge. */
  calculatedFields(): readonly unknown[];
  /** Records the start as a span. Tracing is not part of the foundation. */
  track<Result>(
    name: string,
    run: (span: { setAttribute(key: string, value: string | number): void }) => Promise<Result>,
  ): Promise<Result>;
  generatePrivateSiteAccessCode(): string;
}

/** What the shared step hands settings. */
export interface SettingsGiven {
  readonly foundation: Pick<Foundation, 'config' | 'logging'>;
  readonly limits: Pick<LimitService, 'isDisabled'>;
  readonly 'settings-transition': SettingsTransition;
}
