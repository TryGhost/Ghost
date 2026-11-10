// @ts-expect-error This module lacks type definitions.
import DomainEvents from '@tryghost/domain-events';
import type { Knex } from 'knex';

export class LabelAddedToMembersEvent {
  readonly timestamp = new Date();
  readonly data: { readonly labelId: string; readonly memberIds: readonly string[] };

  constructor(labelId: string, memberIds: readonly string[]) {
    this.data = { labelId, memberIds: [...memberIds] };
  }
}

const pending = new WeakMap<Knex.Transaction, LabelAddedToMembersEvent[]>();

/**
 * Both raw Knex (CSV imports) and Bookshelf transactions must be supported.
 * executionPromise alone cannot distinguish a successful commit from a silent
 * rollback. Wrap commit, as Bookshelf's transaction-events plugin does, and
 * keep savepoint events pending until the outer transaction commits too.
 */
export function dispatchLabelAddedAfterCommit(
  event: LabelAddedToMembersEvent,
  transaction?: Knex.Transaction,
): void {
  if (!transaction) {
    DomainEvents.dispatch(event);
    return;
  }
  const existing = pending.get(transaction);
  if (existing) {
    existing.push(event);
    return;
  }
  const events = [event];
  pending.set(transaction, events);
  // Knex types commit as a QueryBuilder; its runtime result is a promise.
  const committing = transaction as unknown as { commit(value?: unknown): Promise<unknown> };
  const commit = committing.commit;
  committing.commit = async function (...args: Parameters<typeof commit>) {
    const result = await commit.apply(transaction, args);
    pending.delete(transaction);
    try {
      // Knex can resolve commit() while rejecting executionPromise when the
      // COMMIT statement fails. The transaction owner receives that rejection.
      await transaction.executionPromise;
    } catch {
      events.length = 0;
      return result;
    }
    for (const addition of events.splice(0)) {
      dispatchLabelAddedAfterCommit(addition, transaction.parentTransaction);
    }
    return result;
  };
}
