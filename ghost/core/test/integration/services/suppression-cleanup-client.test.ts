import assert from 'node:assert/strict';
import nock from 'nock';
import { SuppressionCleanupClient } from '../../../core/server/services/email-suppression-list/suppression-cleanup-client';

const target = {
  kind: 'complaints' as const,
  email: 'member+tag@example.com',
  domain: 'sending.example.com',
  apiOrigin: 'https://api.eu.mailgun.net',
};
const client = () =>
  new SuppressionCleanupClient({
    baseUrl: 'https://api.eu.mailgun.net/v3',
    apiKey: 'test-api-key',
  });

describe('Suppression cleanup HTTP client', () => {
  beforeAll(() => nock.disableNetConnect());
  afterAll(() => nock.enableNetConnect());
  afterEach(() => nock.cleanAll());

  it('deletes the exact address on the original sending domain with current credentials', async () => {
    const scope = nock(target.apiOrigin)
      .delete('/v3/sending.example.com/complaints/member%2Btag%40example.com')
      .basicAuth({ user: 'api', pass: 'test-api-key' })
      .reply(200, { message: 'Spam complaint has been removed' });
    assert.equal((await client().remove(target)).status, 'removed');
    scope.done();
  });

  it('treats an already absent unsubscribe as successfully cleaned up', async () => {
    const scope = nock(target.apiOrigin)
      .delete('/v3/sending.example.com/unsubscribes/member%2Btag%40example.com')
      .reply(404, { message: 'Address not found' });
    assert.equal((await client().remove({ ...target, kind: 'unsubscribes' })).status, 'absent');
    scope.done();
  });

  it('exposes a retryable status and safe quota hints without retaining request secrets', async () => {
    const resetAt = Date.now() + 10000;
    const scope = nock(target.apiOrigin)
      .delete('/v3/sending.example.com/complaints/member%2Btag%40example.com')
      .reply(
        429,
        { message: 'private-provider-detail' },
        {
          'x-ratelimit-remaining': '0',
          'x-ratelimit-reset': String(resetAt),
          'x-private': 'private-header',
        },
      );
    await assert.rejects(client().remove(target), (error: unknown) => {
      const failure = error as Error & { status?: number; rateLimit?: unknown };
      assert.equal(failure.status, 429);
      assert.deepEqual(failure.rateLimit, { remaining: 0, resetAt });
      const serialized = JSON.stringify(error) + failure.message;
      for (const secret of [
        'test-api-key',
        target.email,
        'private-provider-detail',
        'private-header',
      ]) {
        assert.equal(serialized.includes(secret), false);
      }
      assert.equal('options' in failure, false);
      assert.equal('response' in failure, false);
      assert.equal('cause' in failure, false);
      return true;
    });
    scope.done();
  });

  it('refuses to move a queued deletion to a newly configured API origin', async () => {
    const scope = nock(target.apiOrigin)
      .delete('/v3/sending.example.com/complaints/member%2Btag%40example.com')
      .reply(200, {});
    await assert.rejects(client().remove({ ...target, apiOrigin: 'https://api.mailgun.net' }), {
      code: 'MAILGUN_SUPPRESSION_ORIGIN_CHANGED',
    });
    assert.equal(scope.isDone(), false);
  });

  it.each([401, 403, 500])(
    'exposes HTTP %i without retrying inside the transport',
    async (status) => {
      const scope = nock(target.apiOrigin)
        .delete('/v3/sending.example.com/complaints/member%2Btag%40example.com')
        .reply(status, 'private failure');
      await assert.rejects(client().remove(target), {
        status,
        code: 'MAILGUN_SUPPRESSION_REQUEST_FAILED',
      });
      scope.done();
    },
  );

  it('does not follow redirects on a destructive request', async () => {
    const destination = nock('https://untrusted.example.com').delete('/redirected').reply(200, {});
    const scope = nock(target.apiOrigin)
      .delete('/v3/sending.example.com/complaints/member%2Btag%40example.com')
      .reply(302, '', { location: 'https://untrusted.example.com/redirected' });
    await assert.rejects(client().remove(target), { status: 302 });
    scope.done();
    assert.equal(destination.isDone(), false);
  });

  it('cancels an active request without exposing its transport error', async () => {
    const controller = new AbortController();
    const scope = nock(target.apiOrigin)
      .delete('/v3/sending.example.com/complaints/member%2Btag%40example.com')
      .delay(1000)
      .reply(200, {});
    scope.on('request', () => controller.abort());
    await assert.rejects(client().remove(target, controller.signal), (error: unknown) => {
      const failure = error as Error & { status?: number; code?: string };
      assert.equal(failure.code, 'MAILGUN_SUPPRESSION_REQUEST_FAILED');
      assert.equal(failure.status, undefined);
      assert.equal(JSON.stringify(error).includes('test-api-key'), false);
      return true;
    });
    scope.done();
  });

  it('retains success quota hints so the worker can pace the next request', async () => {
    const resetAt = Date.now() + 10000;
    const scope = nock(target.apiOrigin)
      .delete('/v3/sending.example.com/complaints/member%2Btag%40example.com')
      .reply(200, {}, { 'x-ratelimit-remaining': '0', 'x-ratelimit-reset': String(resetAt) });
    assert.deepEqual((await client().remove(target)).rateLimit, { remaining: 0, resetAt });
    scope.done();
  });
});
