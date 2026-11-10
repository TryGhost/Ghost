import assert from 'node:assert/strict';
import type { Knex } from 'knex';
// @ts-expect-error Module has no type declarations.
import DomainEvents from '@tryghost/domain-events';
import {
  dispatchLabelAddedAfterCommit,
  LabelAddedToMembersEvent,
} from '../../../../../core/server/services/automations/events/label-added-to-members-event';

describe('label addition commit hook', function () {
  afterEach(() => vi.restoreAllMocks());

  it('does not dispatch when Knex resolves commit but rejects transaction execution', async function () {
    const dispatch = vi.spyOn(DomainEvents, 'dispatch');
    const transaction = {
      commit: async () => undefined,
      executionPromise: Promise.reject(new Error('COMMIT failed')),
    };
    dispatchLabelAddedAfterCommit(
      new LabelAddedToMembersEvent('label', ['member']),
      transaction as unknown as Knex.Transaction,
    );
    await transaction.commit();
    assert.equal(dispatch.mock.calls.length, 0);
  });
});
