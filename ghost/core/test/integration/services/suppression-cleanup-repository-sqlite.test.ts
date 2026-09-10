import assert from 'node:assert/strict';
import createKnex, { type Knex } from 'knex';
import { SuppressionCleanupRepository } from '../../../core/server/services/email-suppression-list/suppression-cleanup-repository';

const { createTable } = require('../../../core/server/data/schema/commands');
const request = {
  kind: 'complaints' as const,
  email: 'member@example.com',
  domain: 'sending.example.com',
  apiOrigin: 'https://api.eu.mailgun.net',
  eventId: 'mailgun-event-1',
  eventTimestamp: '2026-09-01T12:00:00.000Z',
};

describe('SuppressionCleanupRepository', () => {
  let knex: Knex;
  let repository: SuppressionCleanupRepository;
  const now = new Date('2026-09-10T12:00:00Z');

  beforeEach(async () => {
    knex = createKnex({
      client: 'better-sqlite3',
      connection: { filename: ':memory:' },
      useNullAsDefault: true,
    });
    await createTable('outbox', knex);
    repository = new SuppressionCleanupRepository(knex);
  });

  afterEach(async () => {
    await knex.destroy();
  });

  it('makes a committed intent available for one worker claim', async () => {
    await knex.transaction(async (trx) => {
      assert.equal(await repository.enqueue(request, trx, now), true);
    });
    const claim = await repository.claim(now);
    assert.ok(claim);
    assert.deepEqual(JSON.parse(claim.payload), request);
    assert.equal(claim.attempt, 1);
    assert.equal(await repository.claim(now), null);
  });

  it('deduplicates a replay so the producer can skip reapplying local state', async () => {
    const first = await knex.transaction((trx) => repository.enqueue(request, trx, now));
    const replay = await knex.transaction((trx) => repository.enqueue({ ...request }, trx, now));
    assert.equal(first, true);
    assert.equal(replay, false);
    assert.ok(await repository.claim(now));
    assert.equal(await repository.claim(now), null);
  });

  it('reclaims an expired lease after a worker crash with a new attempt number', async () => {
    await knex.transaction((trx) => repository.enqueue(request, trx, now));
    const first = await repository.claim(now);
    assert.ok(first);
    assert.equal(await repository.claim(new Date(now.getTime() + 599999)), null);
    const recovered = await repository.claim(new Date(now.getTime() + 600000));
    assert.ok(recovered);
    assert.equal(recovered.id, first.id);
    assert.equal(recovered.attempt, 2);
    assert.deepEqual(JSON.parse(recovered.payload), request);
  });

  it('allows completion only by the current lease owner', async () => {
    await knex.transaction((trx) => repository.enqueue(request, trx, now));
    const first = await repository.claim(now);
    const later = new Date(now.getTime() + 600000);
    const recovered = await repository.claim(later);
    assert.ok(first && recovered);
    assert.equal(await repository.complete(first, later), false);
    assert.equal(await repository.complete(recovered, later), true);
    assert.equal(await repository.claim(new Date(later.getTime() + 600000)), null);
    assert.equal(await knex.transaction((trx) => repository.enqueue(request, trx, later)), false);
  });

  it('persists a retry deadline without rounding provider hints down', async () => {
    await knex.transaction((trx) => repository.enqueue(request, trx, now));
    const claim = await repository.claim(now);
    assert.ok(claim);
    assert.equal(
      await repository.retry(claim, new Date(now.getTime() + 1500), 'HTTP_429', now),
      true,
    );
    assert.equal(await repository.complete(claim, now), false);
    assert.equal(await repository.claim(new Date(now.getTime() + 1499)), null);
    const retried = await repository.claim(new Date(now.getTime() + 2000));
    assert.ok(retried);
    assert.equal(retried.attempt, 2);
  });

  it('returns malformed payloads to the worker for failure handling instead of wedging selection', async () => {
    await knex.transaction((trx) => repository.enqueue(request, trx, now));
    await knex('outbox').update({ payload: '{broken' });
    const claim = await repository.claim(now);
    assert.ok(claim);
    assert.equal(claim.payload, '{broken');
  });

  it('quarantines an invalid item without blocking subsequent work', async () => {
    await knex.transaction((trx) => repository.enqueue(request, trx, now));
    const claim = await repository.claim(now);
    assert.ok(claim);
    assert.equal(await repository.fail(claim, 'INVALID_PAYLOAD', now), true);
    await knex.transaction((trx) =>
      repository.enqueue({ ...request, eventId: 'next-event' }, trx, now),
    );
    const next = await repository.claim(now);
    assert.ok(next);
    assert.notEqual(next.id, claim.id);
    assert.equal(await repository.retry(claim, now, 'RETRY', now), false);
  });

  it('rolls back intent reservation so a replay can safely apply local state', async () => {
    await assert.rejects(
      knex.transaction(async (trx) => {
        assert.equal(await repository.enqueue(request, trx, now), true);
        throw new Error('local safety update failed');
      }),
      /local safety update failed/,
    );
    assert.equal(await repository.claim(now), null);
    assert.equal(await knex.transaction((trx) => repository.enqueue(request, trx, now)), true);
  });

  it('rejects retry and failure writes from an expired owner after reclamation', async () => {
    await knex.transaction((trx) => repository.enqueue(request, trx, now));
    const old = await repository.claim(now);
    const later = new Date(now.getTime() + 600000);
    const current = await repository.claim(later);
    assert.ok(old && current);
    assert.equal(await repository.retry(old, now, 'HTTP_429', later), false);
    assert.equal(await repository.fail(old, 'INVALID_PAYLOAD', later), false);
    assert.equal(await repository.complete(current, later), true);
  });

  it('claims due work while another item is deferred and ignores unrelated event types', async () => {
    await knex('outbox').insert({
      id: 'unrelated',
      event_type: 'another-service',
      status: 'pending',
      payload: '{}',
      created_at: '2026-01-01 00:00:00',
    });
    await knex.transaction((trx) => repository.enqueue(request, trx, now));
    const delayed = await repository.claim(now);
    assert.ok(delayed);
    await repository.retry(delayed, new Date(now.getTime() + 60000), 'HTTP_429', now);
    await knex.transaction((trx) =>
      repository.enqueue({ ...request, eventId: 'due-now' }, trx, now),
    );
    const due = await repository.claim(now);
    assert.ok(due);
    assert.equal(JSON.parse(due.payload).eventId, 'due-now');
    assert.equal(await repository.claim(now), null);
  });

  it('keeps different provider events, domains and suppression kinds distinct', async () => {
    const distinct = [
      request,
      { ...request, eventId: 'another-event' },
      { ...request, domain: 'fallback.example.com' },
      { ...request, kind: 'unsubscribes' as const },
    ];
    for (const item of distinct) {
      assert.equal(await knex.transaction((trx) => repository.enqueue(item, trx, now)), true);
    }
    const ids = new Set<string>();
    for (const _item of distinct) {
      const claim = await repository.claim(now);
      assert.ok(claim);
      ids.add(claim.id);
    }
    assert.equal(ids.size, distinct.length);
  });
});
