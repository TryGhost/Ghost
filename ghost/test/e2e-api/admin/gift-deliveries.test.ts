import sinon from 'sinon';

const domainEvents = require('@tryghost/domain-events');
const models = require('../../../core/server/models');
const { getSignedAdminToken } = require('../../../core/server/adapters/scheduling/utils');
const {
  agentProvider,
  fixtureManager,
  matchers,
  assertions,
} = require('../../utils/e2e-framework');
const {
  StartGiftDeliveryFlushEvent,
} = require('../../../core/server/services/gifts/events/start-gift-delivery-flush-event');

const { anyContentVersion, anyEtag, anyErrorId } = matchers;
const { cacheInvalidateHeaderNotSet } = assertions;

describe('Gift Deliveries API', function () {
  let agent: { put: (_url: string) => any };
  let schedulerKey: { id: string; secret: string };
  let schedulerToken: string;

  beforeAll(async function () {
    agent = await agentProvider.getAdminAPIAgent();
    await fixtureManager.init('integrations', 'api_keys');

    schedulerKey = await models.Integration.getApiKeyBySlug('ghost-scheduler', 'admin');

    schedulerToken = getSignedAdminToken({
      publishedAt: new Date().toISOString(),
      apiUrl: '/admin/',
      key: schedulerKey,
    });
  });

  afterEach(function () {
    sinon.restore();
  });

  describe('flushDeliveries', function () {
    let dispatchStub: sinon.SinonStub;

    beforeEach(function () {
      dispatchStub = sinon.stub(domainEvents, 'dispatch');
    });

    it('does not flush when request lacks a token', async function () {
      await agent
        .put('gifts/flush_deliveries/')
        .expectStatus(401)
        .expect(cacheInvalidateHeaderNotSet())
        .matchHeaderSnapshot({
          'content-version': anyContentVersion,
          etag: anyEtag,
        })
        .matchBodySnapshot({
          errors: [
            {
              id: anyErrorId,
              message: 'Invalid token: No token found in URL',
            },
          ],
        });

      sinon.assert.notCalled(dispatchStub);
    });

    it('does not flush when request token is invalid', async function () {
      const invalidSchedulerToken = getSignedAdminToken({
        publishedAt: new Date().toISOString(),
        apiUrl: '/members/',
        key: schedulerKey,
      });

      await agent
        .put(`gifts/flush_deliveries/?token=${invalidSchedulerToken}`)
        .expectStatus(401)
        .expect(cacheInvalidateHeaderNotSet())
        .matchHeaderSnapshot({
          'content-version': anyContentVersion,
          etag: anyEtag,
        })
        .matchBodySnapshot({
          errors: [
            {
              id: anyErrorId,
            },
          ],
        });

      sinon.assert.notCalled(dispatchStub);
    });

    it('dispatches a flush event with a valid scheduler integration token', async function () {
      await agent
        .put(`gifts/flush_deliveries/?token=${schedulerToken}`)
        .expectStatus(204)
        .expectEmptyBody()
        .expect(cacheInvalidateHeaderNotSet())
        .matchHeaderSnapshot({
          'content-version': anyContentVersion,
          etag: anyEtag,
        });

      sinon.assert.calledOnceWithExactly(
        dispatchStub,
        sinon.match.instanceOf(StartGiftDeliveryFlushEvent),
      );
    });
  });
});
