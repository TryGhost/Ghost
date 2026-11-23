import type { GhostLogger } from '@tryghost/logging';
import type { Knex } from 'knex';
import { z } from 'zod';
import type settingsCache from '../../../shared/settings-cache';
import { afterCommit } from '../../lib/after-commit';
import { DbDate } from '../../lib/db-types/date';
import type { OnSegmentUpdated } from './changes';
import type { SegmentsTracking } from './tracking';

/**
 * A settings row as the settings cache holds it after a settings save: every column, with the
 * dates as `Date`s to the second.
 */
const CachedSetting = z.object({
  id: z.string(),
  group: z.string(),
  key: z.string(),
  value: z.string().nullable(),
  type: z.string(),
  flags: z.string().nullable(),
  created_at: DbDate,
  updated_at: DbDate.nullable(),
});

interface RefreshDeps {
  /** The service's own connection, which reads only what has been committed. */
  knex: Knex;
  cache: Pick<typeof settingsCache, 'set'>;
  logging: Pick<GhostLogger, 'error'>;
  tracking: Pick<SegmentsTracking, 'settingsCacheRefreshFailed'>;
  /** The key of the setting the segments are stored in. */
  settingKey: string;
}

/** Reads the setting with `settingKey` as it is stored now, and puts it in the settings cache. */
async function refreshCache({ knex, cache, settingKey }: RefreshDeps): Promise<void> {
  const row: unknown = await knex('settings').where('key', settingKey).first();
  const setting = CachedSetting.parse(row);
  cache.set(setting.key, setting);
}

/**
 * Keeps the settings cache, which `GET /settings/` and `settingsCache.get` read, in step with the
 * setting the segments are stored in. Once the command's transaction ends without an error, the
 * setting is read again on the service's own connection and put in the cache.
 *
 * The cache is brought up to date shortly after the commit rather than before the command
 * returns, so a `GET /settings/` in that moment can still return the previous value. In return,
 * the cache only ever holds what is stored: the refresh reads committed state, so running it
 * after a transaction that was rolled back without an error, which settles as a commit does,
 * leaves the cache as it was. A failed refresh is logged and counted, and leaves the cache as it
 * was.
 *
 * Refreshes run one after another, each reading only once the one before it has set the cache,
 * so an earlier read can never land after a later one and put an older value back.
 */
export function refreshSettingsCache(deps: RefreshDeps): OnSegmentUpdated {
  let lastRefresh: Promise<void> = Promise.resolve();

  return async (trx) => {
    afterCommit(
      trx,
      () => {
        lastRefresh = lastRefresh
          .then(() => refreshCache(deps))
          .catch((err: unknown) => {
            deps.logging.error(
              { event: { name: 'segments.refresh-settings-cache.failed' }, err },
              'Could not refresh the settings cache after a segment change',
            );
            deps.tracking.settingsCacheRefreshFailed();
          });
        return lastRefresh;
      },
      () => {}, // Rolled back with an error: the cache keeps the value that is still stored.
    );
  };
}
