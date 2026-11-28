const assert = require('assert/strict');
const sinon = require('sinon');
const ActivityPubService = require('../../../core/server/services/activitypub');
const { agentProvider, fixtureManager, matchers } = require('../../utils/e2e-framework');
const { anyContentVersion, anyEtag, anyErrorId } = matchers;

describe('ActivityPub Admin API', function () {
  let agent;
  let disconnectStub;

  beforeAll(async function () {
    agent = await agentProvider.getAdminAPIAgent();
    await fixtureManager.init('users');
  });

  beforeEach(function () {
    disconnectStub = sinon.stub(ActivityPubService, 'disconnect').resolves();
  });

  afterEach(function () {
    sinon.restore();
  });

  describe('As Owner', function () {
    beforeAll(async function () {
      await agent.loginAsOwner();
    });

    it('Can soft-disconnect Social Web', async function () {
      await agent.delete('activitypub/').expectStatus(204).matchHeaderSnapshot({
        'content-version': anyContentVersion,
        etag: anyEtag,
      });

      assert.equal(disconnectStub.calledOnce, true);
    });
  });

  describe('As Admin', function () {
    beforeAll(async function () {
      await agent.loginAsAdmin();
    });

    it('Rejects soft-disconnect', async function () {
      await agent
        .delete('activitypub/')
        .expectStatus(403)
        .matchBodySnapshot({
          errors: [
            {
              id: anyErrorId,
            },
          ],
        });

      assert.equal(disconnectStub.called, false);
    });
  });
});
