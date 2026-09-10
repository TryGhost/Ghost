import type { Knex } from 'knex';
import { IncorrectUsageError } from '@tryghost/errors';
import { RECIPIENT_VERIFICATION_CODE } from './recipient-accounting';

export function validatePreparationConcurrency(value: unknown): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 1) {
    throw new IncorrectUsageError({
      message: 'bulkEmail:batchCreationConcurrency must be a positive integer',
    });
  }
  return value;
}

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
        query.select('members.id', knex.raw('? as segment_index', [index])),
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

/** Resolve only selected IDs. The extra range row distinguishes sparse from complete reads. */
export async function resolvePreparationMembers(
  knex: Knex,
  ids: string[],
): Promise<PreparationMember[]> {
  if (ids.length === 0) {
    return [];
  }
  const columns = ['id', 'uuid', 'email', 'name'];
  const limit = ids.length * 8;
  let rows: PreparationMember[] = await knex('members')
    .select(columns)
    .whereBetween('id', [ids[ids.length - 1]!, ids[0]!])
    .orderBy('id', 'desc')
    .limit(limit + 1);
  if (rows.length > limit) {
    // Do not retain the truncated range while the fallback is materialized.
    rows = [];
    rows = await knex('members').select(columns).whereIn('id', ids);
  }
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

/** Fixed workers claim lazily; every exit drains them, including dispatcher failures. */
export async function runPreparationWorkers<T>(
  items: Iterable<T>,
  concurrency: number,
  beforeWork: () => void,
  work: (item: T, signal: AbortSignal) => Promise<void>,
): Promise<void> {
  validatePreparationConcurrency(concurrency);
  const controller = new AbortController();
  const iterator = items[Symbol.iterator]();
  const failures: unknown[] = [];
  const worker = async () => {
    try {
      while (!controller.signal.aborted) {
        beforeWork();
        const next = iterator.next();
        if (next.done) {
          return;
        }
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

export function* preparationPages(ids: string[], batchSize: number, warmingCapacity = Infinity) {
  for (let offset = 0; offset < ids.length;) {
    const remainingCapacity = warmingCapacity - offset;
    const useFallbackDomain = remainingCapacity <= 0;
    const pageSize = useFallbackDomain ? batchSize : Math.min(remainingCapacity, batchSize);
    yield { ids: ids.slice(offset, offset + pageSize), offset, useFallbackDomain };
    offset += pageSize;
  }
}
