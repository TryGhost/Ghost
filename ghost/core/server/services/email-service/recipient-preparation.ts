import type { Knex } from 'knex';
import { IncorrectUsageError } from '@tryghost/errors';
import { RECIPIENT_VERIFICATION_CODE } from './recipient-accounting';

/** One statement gives all segments the same audience snapshot, without a spanning transaction. */
export async function selectPreparationCandidates(
  knex: Knex,
  queries: Knex.QueryBuilder[],
): Promise<string[][]> {
  const candidates: string[][] = queries.map(() => []);
  if (queries.length === 0) {
    return candidates;
  }
  const rows: { id: string; segment_index: number }[] = await knex
    .unionAll(
      queries.map((query, index) =>
        query.clone().select('members.id', knex.raw('? as segment_index', [index])),
      ),
    )
    .orderBy('segment_index')
    .orderBy('id', 'desc');
  for (const { id, segment_index: segmentIndex } of rows) {
    const ids = candidates[segmentIndex]!;
    // Ordered rows let us collapse duplicate IDs within a segment without another full-size set.
    if (id !== ids[ids.length - 1]) {
      ids.push(id);
    }
  }
  return candidates;
}

export type PreparationMember = { id: string; uuid: string; email: string; name: string | null };

/** Load only selected members and preserve candidate order, omitting members no longer present. */
export async function resolvePreparationMembers(
  knex: Knex,
  ids: string[],
): Promise<PreparationMember[]> {
  if (ids.length === 0) {
    return [];
  }
  const rows: PreparationMember[] = await knex('members')
    .select('id', 'uuid', 'email', 'name')
    .whereIn('id', ids);
  const byId = new Map(rows.map((row) => [row.id, row]));
  return ids.flatMap((id) => {
    const row = byId.get(id);
    return row ? [row] : [];
  });
}

/** Only waits are abortable: callers must settle writes and recovery before returning. */
export function waitForPreparationRetry(ms: number, signal?: AbortSignal): Promise<void> {
  signal?.throwIfAborted();
  return new Promise((resolve, reject) => {
    const finish = () => {
      signal?.removeEventListener('abort', abort);
      resolve();
    };
    const timer = setTimeout(finish, ms);
    const abort = () => {
      clearTimeout(timer);
      signal?.removeEventListener('abort', abort);
      reject(signal?.reason);
    };
    signal?.addEventListener('abort', abort, { once: true });
  });
}

/** The caller validates concurrency. Every exit drains workers, including dispatcher failures. */
export async function runPreparationWorkers<T>(
  items: Iterable<T>,
  concurrency: number,
  beforeWork: () => void,
  work: (item: T, signal: AbortSignal) => Promise<void>,
): Promise<void> {
  const controller = new AbortController();
  const iterator = items[Symbol.iterator]();
  const failures: unknown[] = [];
  const worker = async () => {
    try {
      while (!controller.signal.aborted) {
        const next = iterator.next();
        if (next.done) {
          return;
        }
        beforeWork();
        await work(next.value, controller.signal);
      }
    } catch (error) {
      failures.push(error);
      controller.abort(error);
    }
  };
  await Promise.all(Array.from({ length: concurrency }, () => worker()));
  const verification = failures.find(
    (error) =>
      error instanceof Error && 'code' in error && error.code === RECIPIENT_VERIFICATION_CODE,
  );
  if (failures.length > 0) {
    throw verification ?? failures[0];
  }
}

export function preparationPages(ids: string[], batchSize: number, warmingCapacity = Infinity) {
  // Validate eagerly, before the caller uses batchSize to calculate the worker count.
  if (!Number.isSafeInteger(batchSize) || batchSize < 1) {
    throw new IncorrectUsageError({ message: 'bulkEmail:batchSize must be a positive integer' });
  }
  return (function* pages() {
    for (let offset = 0; offset < ids.length;) {
      const remainingCapacity = warmingCapacity - offset;
      const useFallbackDomain = remainingCapacity <= 0;
      const pageSize = useFallbackDomain ? batchSize : Math.min(remainingCapacity, batchSize);
      yield { ids: ids.slice(offset, offset + pageSize), offset, useFallbackDomain };
      offset += pageSize;
    }
  })();
}
