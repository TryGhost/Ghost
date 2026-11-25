import assert from 'node:assert/strict';
import nock from 'nock';
import ObjectID from 'bson-objectid';
import { ActivityPubService } from '../../../core/server/services/activitypub/activity-pub-service';
import type { IdentityTokenService } from '../../../core/server/services/identity-tokens/identity-token-service';

const testUtils = require('../../utils');
const db = require('../../../core/server/data/db');

describe('ActivityPub webhooks: concurrent initialisation', function () {
  const siteUrl = new URL('http://fake-site-url');
  const integrationId = new ObjectID().toHexString();

  beforeAll(testUtils.teardownDb);
  beforeAll(testUtils.setup('users:roles'));
  beforeAll(async function () {
    await db.knex('integrations').insert({
      id: integrationId,
      type: 'internal',
      name: 'Ghost ActivityPub',
      slug: 'ghost-activitypub',
      created_at: db.knex.raw('current_timestamp'),
    });
  });
  afterAll(testUtils.teardownDb);
  afterEach(function () {
    nock.cleanAll();
  });

  function createService() {
    const logging = { info() {}, warn() {}, error() {} };
    const identityTokenService = { getTokenForUser: () => 'token' };
    return new ActivityPubService(
      db.knex,
      siteUrl,
      logging,
      identityTokenService as unknown as IdentityTokenService,
    );
  }

  it('leaves 4 webhooks when two runs find them wrong at the same moment', async function () {
    nock(siteUrl)
      .get('/.ghost/activitypub/v1/site/')
      .times(2)
      .reply(200, { webhook_secret: 'secret' });

    await Promise.all([createService().initialiseWebhooks(), createService().initialiseWebhooks()]);

    const webhooks = await db.knex('webhooks').where('integration_id', integrationId);
    assert.deepEqual(webhooks.map((webhook: { event: string }) => webhook.event).sort(), [
      'post.deleted',
      'post.published',
      'post.published.edited',
      'post.unpublished',
    ]);
  });
});
