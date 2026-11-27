import DatabaseInfo from '@tryghost/database-info';
import errors from '@tryghost/errors';
import type { Knex } from 'knex';

const WEBHOOK_ID_SETTING = 'members_stripe_webhook_id';
const WEBHOOK_SECRET_SETTING = 'members_stripe_webhook_secret';

/**
 * How long a Ghost waits for another Ghost that is creating the webhook. The other Ghost holds the
 * lock for two Stripe calls, which take about a second together.
 */
const LOCK_WAIT_MS = 5000;

export interface StoredWebhook {
  webhook_id: string | null;
  secret: string | null;
}

interface SettingsModel {
  findOne(data: { key: string }): Promise<{ get(key: 'value'): unknown } | null>;
  edit(
    data: { key: string; value: string | null }[],
    options?: { transacting?: Knex.Transaction },
  ): Promise<unknown>;
}

export interface WebhookStoreDeps {
  settingsCache: { get(key: string): unknown };
  Settings: SettingsModel;
  transaction: <T>(fn: (transacting: Knex.Transaction) => Promise<T>) => Promise<T>;
  lockWaitMs?: number;
}

const asString = (value: unknown): string | null =>
  typeof value === 'string' && value ? value : null;

/** The id and secret of the site's Stripe webhook, which Ghost keeps in two settings. */
export class WebhookStore {
  readonly #deps: WebhookStoreDeps;

  constructor(deps: WebhookStoreDeps) {
    this.#deps = deps;
  }

  async get(): Promise<StoredWebhook> {
    return {
      webhook_id: asString(this.#deps.settingsCache.get(WEBHOOK_ID_SETTING)),
      secret: asString(this.#deps.settingsCache.get(WEBHOOK_SECRET_SETTING)),
    };
  }

  async save(data: StoredWebhook, options: { transacting?: Knex.Transaction } = {}): Promise<void> {
    await this.#deps.Settings.edit(
      [
        { key: WEBHOOK_ID_SETTING, value: data.webhook_id },
        { key: WEBHOOK_SECRET_SETTING, value: data.secret },
      ],
      options,
    );
  }

  /**
   * The stored secret from the database, which holds what another Ghost saved after this Ghost's
   * settings cache loaded.
   */
  async readSecret(): Promise<string | null> {
    return this.#read(WEBHOOK_SECRET_SETTING);
  }

  /** The stored webhook id from the database, for the same reason as `readSecret`. */
  async readWebhookId(): Promise<string | null> {
    return this.#read(WEBHOOK_ID_SETTING);
  }

  async #read(key: string): Promise<string | null> {
    const setting = await this.#deps.Settings.findOne({ key });
    return asString(setting?.get('value'));
  }

  transaction<T>(fn: (transacting: Knex.Transaction) => Promise<T>): Promise<T> {
    return this.#deps.transaction(fn);
  }

  /**
   * Locks the two settings rows for the rest of the transaction and returns the stored webhook
   * from the database, which holds what another Ghost saved while this one waited for the lock.
   */
  async getForUpdate(transacting: Knex.Transaction): Promise<StoredWebhook> {
    const query = transacting('settings')
      .whereIn('key', [WEBHOOK_ID_SETTING, WEBHOOK_SECRET_SETTING])
      .orderBy('id')
      .forUpdate()
      .select('key', 'value');

    // SQLite has no row locks to wait for, and knex can't cancel its queries.
    if (DatabaseInfo.isMySQL(transacting)) {
      query.timeout(this.#deps.lockWaitMs ?? LOCK_WAIT_MS, { cancel: true });
    }

    let rows: { key: string; value: unknown }[];
    try {
      rows = await query;
    } catch (err) {
      if (err instanceof Error && err.name === 'KnexTimeoutError') {
        throw new errors.InternalServerError({
          err,
          message: 'Timed out waiting for another Ghost to create the Stripe webhook.',
        });
      }
      throw err;
    }

    const valueOf = (key: string) => asString(rows.find((row) => row.key === key)?.value);
    return { webhook_id: valueOf(WEBHOOK_ID_SETTING), secret: valueOf(WEBHOOK_SECRET_SETTING) };
  }
}
