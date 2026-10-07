import type { Knex } from 'knex';
import { IncorrectUsageError } from '@tryghost/errors';
import { RECIPIENT_VERIFICATION_CODE } from './recipient-accounting';

export type PreparationCandidate = { id: string; segmentIndex: number };

function isMySQL(knex: Knex): boolean {
  return ['mysql', 'mysql2'].includes(knex.client?.config?.client);
}

/**
 * One statement gives all segments the same audience snapshot, without a spanning transaction.
 * On MySQL each branch carries its own `ORDER BY id DESC LIMIT`, which the optimizer serves as a
 * reverse primary-key scan, so rows stream newest-first per segment without materializing or
 * sorting the union. MySQL silently drops a branch ORDER BY that has no LIMIT. SQLite cannot order
 * compound-select members and buffers the result anyway, so it keeps the outer ORDER BY.
 */
export type PreparationSelectionOptions = {
  /** Column whose descending index order delivers newest-first rows without a sort. */
  orderColumn?: string;
  /** MySQL join order that makes `orderColumn`'s index the driving table. */
  joinOrder?: string[];
};

export function buildPreparationSelection(
  knex: Knex,
  queries: Knex.QueryBuilder[],
  { orderColumn = 'members.id', joinOrder }: PreparationSelectionOptions = {},
): Knex.QueryBuilder {
  if (isMySQL(knex)) {
    const hint = joinOrder?.length
      ? `/*+ JOIN_ORDER(${joinOrder.map((table) => `\`${table}\``).join(', ')}) */ `
      : '';
    return knex.unionAll(
      queries.map((query, index) =>
        query
          .clone()
          .select(knex.raw(`${hint}??`, ['members.id']), knex.raw('? as segment_index', [index]))
          .orderBy(orderColumn, 'desc')
          .limit(Number.MAX_SAFE_INTEGER),
      ),
      true,
    );
  }
  const branches = queries.map((query, index) =>
    query.clone().select('members.id', knex.raw('? as segment_index', [index])),
  );
  return knex.unionAll(branches).orderBy('segment_index').orderBy('id', 'desc');
}

/** Streams candidates in segment order, newest first, collapsing adjacent duplicate IDs within a segment. */
export async function* streamPreparationCandidates(
  knex: Knex,
  queries: Knex.QueryBuilder[],
  options: PreparationSelectionOptions = {},
): AsyncGenerator<PreparationCandidate> {
  if (queries.length === 0) {
    return;
  }
  let lastSegment = -1;
  let lastId: string | null = null;
  for await (const row of buildPreparationSelection(knex, queries, options).stream()) {
    const segmentIndex = Number(row.segment_index);
    const id: string = row.id;
    if (segmentIndex !== lastSegment) {
      lastSegment = segmentIndex;
      lastId = null;
    }
    if (id === lastId) {
      continue;
    }
    lastId = id;
    yield { id, segmentIndex };
  }
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

export type PreparationSource<T> = Iterable<T> | { next(): Promise<IteratorResult<T>> };

/**
 * Hands items to workers as they become available. A producer may wait on `drained` to stay a
 * bounded distance ahead of the workers; it decides for itself when waiting is no longer safe.
 */
export class PreparationQueue<T> {
  #items: T[] = [];
  #closed = false;
  #error: unknown = null;
  #failed = false;
  #waiters: { resolve: (result: IteratorResult<T>) => void; reject: (error: unknown) => void }[] =
    [];
  #drainWaiters: { threshold: number; resolve: () => void }[] = [];

  push(item: T): void {
    const waiter = this.#waiters.shift();
    if (waiter) {
      waiter.resolve({ value: item, done: false });
    } else {
      this.#items.push(item);
    }
  }

  size(): number {
    return this.#items.length;
  }

  /** Resolves once at most `threshold` items are waiting. */
  drained(threshold: number): Promise<void> {
    if (this.#items.length <= threshold) {
      return Promise.resolve();
    }
    return new Promise((resolve) => {
      this.#drainWaiters.push({ threshold, resolve });
    });
  }

  #notifyDrained(): void {
    this.#drainWaiters = this.#drainWaiters.filter((waiter) => {
      if (this.#items.length <= waiter.threshold) {
        waiter.resolve();
        return false;
      }
      return true;
    });
  }

  close(): void {
    this.#closed = true;
    for (const waiter of this.#waiters.splice(0)) {
      waiter.resolve({ value: undefined, done: true });
    }
  }

  fail(error: unknown): void {
    this.#failed = true;
    this.#error = error;
    for (const waiter of this.#waiters.splice(0)) {
      waiter.reject(error);
    }
    // Producers waiting to run ahead must wake up to observe the failure.
    for (const waiter of this.#drainWaiters.splice(0)) {
      waiter.resolve();
    }
  }

  next(): Promise<IteratorResult<T>> {
    if (this.#failed) {
      return Promise.reject(this.#error);
    }
    if (this.#items.length > 0) {
      const value = this.#items.shift()!;
      this.#notifyDrained();
      return Promise.resolve({ value, done: false });
    }
    if (this.#closed) {
      return Promise.resolve({ value: undefined, done: true });
    }
    return new Promise((resolve, reject) => {
      this.#waiters.push({ resolve, reject });
    });
  }
}

/** The caller validates concurrency. Every exit drains workers, including dispatcher failures. */
export async function runPreparationWorkers<T>(
  items: PreparationSource<T>,
  concurrency: number,
  beforeWork: () => void,
  work: (item: T, signal: AbortSignal) => Promise<void>,
): Promise<void> {
  const controller = new AbortController();
  const iterator =
    Symbol.iterator in Object(items)
      ? (items as Iterable<T>)[Symbol.iterator]()
      : (items as { next(): Promise<IteratorResult<T>> });
  const failures: unknown[] = [];
  const worker = async () => {
    try {
      while (!controller.signal.aborted) {
        const next = await iterator.next();
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

export type PreparationPage = { ids: string[]; offset: number; useFallbackDomain: boolean };

/**
 * Cuts candidate IDs into pages as they arrive. While warming capacity remains, a page ends at the
 * capacity boundary; after that, pages are full-size on the fallback domain. Every candidate placed
 * in a page consumes capacity, so exclusions keep their warming positions.
 */
export class PreparationPageBuilder {
  #batchSize: number;
  #capacity: number;
  #offset = 0;
  #ids: string[] = [];

  constructor(batchSize: number, warmingCapacity = Infinity) {
    if (!Number.isSafeInteger(batchSize) || batchSize < 1) {
      throw new IncorrectUsageError({ message: 'bulkEmail:batchSize must be a positive integer' });
    }
    this.#batchSize = batchSize;
    this.#capacity = warmingCapacity;
  }

  #pageSize(): number {
    const remainingCapacity = this.#capacity - this.#offset;
    return remainingCapacity <= 0 ? this.#batchSize : Math.min(remainingCapacity, this.#batchSize);
  }

  push(id: string): PreparationPage | null {
    this.#ids.push(id);
    return this.#ids.length >= this.#pageSize() ? this.flush() : null;
  }

  flush(): PreparationPage | null {
    if (this.#ids.length === 0) {
      return null;
    }
    const page = {
      ids: this.#ids,
      offset: this.#offset,
      useFallbackDomain: this.#capacity - this.#offset <= 0,
    };
    this.#offset += page.ids.length;
    this.#ids = [];
    return page;
  }
}
