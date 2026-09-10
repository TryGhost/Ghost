import assert from 'node:assert/strict';
import type { Knex } from 'knex';
import { SuppressionCleanupRepository } from '../../../core/server/services/email-suppression-list/suppression-cleanup-repository';

const { agentProvider } = require('../../utils/e2e-framework');
const { knex }: { knex: Knex } = require('../../../core/server/data/db');

const request = {
  kind: 'complaints' as const,
  email: 'member@example.com',
  domain: 'sending.example.com',
  apiOrigin: 'https://api.eu.mailgun.net',
  eventId: 'mailgun-event-1',
  eventTimestamp: '2026-09-01T12:00:00.000Z',
};
const now = new Date('2026-09-10T12:00:00Z');

describe('Suppression cleanup repository on MySQL', () => {
  const repository = new SuppressionCleanupRepository(knex);

  beforeAll(async () => {
    await agentProvider.getAdminAPIAgent();
  });
  afterEach(async () => {
    await knex('outbox').where('event_type', 'email-suppression-cleanup').delete();
  });

  it('gives concurrent workers distinct claims without losing queued work', async () => {
    for (let index = 0; index < 4; index++) {
      await knex.transaction((trx) =>
        repository.enqueue({ ...request, eventId: `event-${index}` }, trx, now),
      );
    }
    const claims = (
      await Promise.all(Array.from({ length: 8 }, () => repository.claim(now)))
    ).filter((claim) => claim !== null);
    assert.equal(claims.length, 4);
    assert.equal(new Set(claims.map((claim) => claim.id)).size, 4);
    assert.ok(claims.every((claim) => claim.attempt === 1));
  });

  it('allows another worker to claim due work while the oldest row is locked', async () => {
    await knex.transaction((trx) => repository.enqueue(request, trx, now));
    await knex.transaction((trx) =>
      repository.enqueue({ ...request, eventId: 'later' }, trx, new Date(now.getTime() + 1000)),
    );
    const oldest = await knex('outbox')
      .where('event_type', 'email-suppression-cleanup')
      .orderBy('available_at')
      .first();
    const transaction = await knex.transaction();
    let pending: ReturnType<typeof repository.claim> | undefined;
    try {
      await transaction('outbox').where('id', oldest.id).forUpdate().first();
      pending = repository.claim(new Date(now.getTime() + 1000));
      const claim = await pending;
      assert.ok(claim);
      assert.notEqual(claim.id, oldest.id);
      assert.equal(JSON.parse(claim.payload).eventId, 'later');
    } finally {
      await transaction.rollback();
      await pending;
    }
  });

  it('reserves the intent exactly once across concurrent producer transactions', async () => {
    const results = await Promise.all(
      Array.from({ length: 4 }, () =>
        knex.transaction((trx) => repository.enqueue(request, trx, now)),
      ),
    );
    assert.equal(results.filter(Boolean).length, 1);
    assert.ok(await repository.claim(now));
    assert.equal(await repository.claim(now), null);
  });

  it('does not expose an uncommitted intent and makes a rolled-back event replayable', async () => {
    const transaction = await knex.transaction();
    try {
      await repository.enqueue(request, transaction, now);
      assert.equal(await repository.claim(now), null);
    } finally {
      await transaction.rollback();
    }
    assert.equal(await repository.claim(now), null);
    assert.equal(await knex.transaction((trx) => repository.enqueue(request, trx, now)), true);
  });

  it('fences the expired worker after reclaiming a crashed attempt', async () => {
    await knex.transaction((trx) => repository.enqueue(request, trx, now));
    const first = await repository.claim(now);
    const later = new Date(now.getTime() + 600000);
    const second = await repository.claim(later);
    assert.ok(first && second);
    assert.equal(second.id, first.id);
    assert.equal(second.attempt, 2);
    assert.equal(await repository.complete(first, later), false);
    assert.equal(await repository.retry(first, later, 'HTTP_429', later), false);
    assert.equal(await repository.fail(first, 'INVALID_PAYLOAD', later), false);
    assert.equal(await repository.complete(second, later), true);
  });
});
