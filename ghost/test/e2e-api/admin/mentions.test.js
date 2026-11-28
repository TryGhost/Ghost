const assert = require('node:assert/strict');
const {
  agentProvider,
  fixtureManager,
  mockManager,
  matchers,
} = require('../../utils/e2e-framework');
const models = require('../../../core/server/models');
const context = require('../../utils/fixtures/context');
const { anyObjectId, anyISODateTime, anyString } = matchers;

const matchMentionShallowIncludes = {
  id: anyObjectId,
  source: anyString,
  target: anyString,
  timestamp: anyISODateTime,
  source_title: anyString,
};

describe('Mentions API', function () {
  let agent;

  beforeAll(async function () {
    agent = await agentProvider.getAdminAPIAgent();
    // TODO: test various users' access
    await fixtureManager.init('users', 'mentions');
    await agent.loginAsOwner();
  });

  afterEach(function () {
    mockManager.restore();
  });

  it('Can browse with limits', async function () {
    await agent
      .get('mentions/?limit=2')
      .expectStatus(200)
      .matchBodySnapshot({
        mentions: new Array(2).fill(matchMentionShallowIncludes),
      });
  });

  it('Leaves out deleted mentions unless the filter names deleted', async function () {
    const target = 'https://deleted-mentions.example/';
    for (const [source, deleted] of [
      ['https://kept.example/', false],
      ['https://deleted.example/', true],
    ]) {
      await models.Mention.add(
        { source, target, deleted, created_at: new Date() },
        context.internal,
      );
    }

    const { body: browsed } = await agent
      .get(`mentions/?filter=${encodeURIComponent(`target:'${target}'`)}`)
      .expectStatus(200);
    assert.deepEqual(
      browsed.mentions.map((mention) => mention.source),
      ['https://kept.example/'],
    );

    const { body: deletedOnly } = await agent
      .get(`mentions/?filter=${encodeURIComponent(`target:'${target}'+deleted:true`)}`)
      .expectStatus(200);
    assert.deepEqual(
      deletedOnly.mentions.map((mention) => mention.source),
      ['https://deleted.example/'],
    );
  });
});
