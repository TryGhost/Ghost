const assert = require('node:assert/strict');
const models = require('../../../core/server/models');
const { agentProvider, fixtureManager, matchers } = require('../../utils/e2e-framework');

const newsletterSnapshot = {
  id: matchers.anyObjectId,
  uuid: matchers.anyUuid,
  created_at: matchers.anyISODateTime,
  updated_at: matchers.anyISODateTime,
};

describe('Newsletters Content API', function () {
  let agent;

  beforeAll(async function () {
    agent = await agentProvider.getContentAPIAgent();
    await fixtureManager.init('api_keys', 'newsletters');
    await agent.authenticate();

    await models.Newsletter.edit(
      {
        sender_reply_to: 'private-reply@example.com',
      },
      { id: fixtureManager.get('newsletters', 0).id, context: { internal: true } },
    );
  });

  it('Can request only active newsletters', async function () {
    await agent
      .get('/newsletters/')
      .expectStatus(200)
      .matchHeaderSnapshot({
        'content-version': matchers.anyContentVersion,
        etag: matchers.anyEtag,
      })
      .matchBodySnapshot({
        newsletters: Array(4).fill(newsletterSnapshot),
      });
  });

  it('Cannot override filters to fetch archived newsletters', async function () {
    await agent
      .get('/newsletters/?filter=status:archived')
      .expectStatus(200)
      .matchHeaderSnapshot({
        'content-version': matchers.anyContentVersion,
        etag: matchers.anyEtag,
      })
      .matchBodySnapshot({
        newsletters: Array(4).fill(newsletterSnapshot),
      });
  });

  it('Ignores filters and ordering on newsletter fields that are not exposed', async function () {
    const { body: defaultBody } = await agent.get('/newsletters/?limit=all').expectStatus(200);
    const defaultIds = defaultBody.newsletters.map((newsletter) => newsletter.id);

    for (const filter of [
      "sender_reply_to:'private-reply@example.com'",
      "private.name:'not-a-reviewed-path'",
    ]) {
      await agent
        .get(`/newsletters/?limit=all&filter=${encodeURIComponent(filter)}`)
        .expectStatus(200)
        .expect(({ body }) => {
          assert.deepEqual(
            body.newsletters.map((newsletter) => newsletter.id),
            defaultIds,
          );
        });
    }

    for (const order of ['sender_reply_to desc', 'reply_to asc']) {
      await agent
        .get(`/newsletters/?limit=all&order=${encodeURIComponent(order)}`)
        .expectStatus(200)
        .expect(({ body }) => {
          assert.deepEqual(
            body.newsletters.map((newsletter) => newsletter.id),
            defaultIds,
          );
        });
    }
  });
});
