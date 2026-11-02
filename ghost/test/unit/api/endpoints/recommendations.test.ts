import assert from 'node:assert/strict';
import { IncorrectUsageError } from '@tryghost/errors';
import sinon from 'sinon';

const recommendations = require('../../../../core/server/services/recommendations').default;
const adminEndpoint = require('../../../../core/server/api/endpoints/recommendations');
const contentEndpoint = require('../../../../core/server/api/endpoints/recommendations-public');
const incomingEndpoint = require('../../../../core/server/api/endpoints/incoming-recommendations');

// Each endpoint reads the root's service when a request arrives, so it sees whatever boot
// has initialized by then.
type Endpoint = Record<string, { query(frame: object): Promise<unknown> }>;
type Forwarded = [name: string, endpoint: Endpoint, field: string, methods: string[]];

const forwarded: Forwarded[] = [
  ['admin', adminEndpoint, 'controller', ['browse', 'read', 'add', 'check', 'edit', 'destroy']],
  ['content', contentEndpoint, 'controller', ['browse']],
  ['incoming', incomingEndpoint, 'incomingRecommendationController', ['browse']],
];

describe('Recommendations endpoints', function () {
  const sandbox = sinon.createSandbox();
  const frame = { options: { id: 'recommendation-id' }, data: {} };

  afterEach(function () {
    sandbox.restore();
  });

  for (const [name, endpoint, field, methods] of forwarded) {
    for (const method of methods) {
      it(`${name} ${method} rejects before the root is initialized`, async function () {
        assert.throws(() => recommendations.service, IncorrectUsageError);

        await assert.rejects(
          Promise.resolve().then(() => endpoint[method].query(frame)),
          IncorrectUsageError,
        );
      });

      it(`${name} ${method} forwards the frame to the ${field} read at request time`, async function () {
        const result = { data: [] };
        const operation = sandbox.stub().resolves(result);
        sandbox.stub(recommendations, 'service').get(() => ({ [field]: { [method]: operation } }));

        assert.equal(await endpoint[method].query(frame), result);

        sinon.assert.calledOnceWithExactly(operation, frame);
      });
    }
  }

  for (const method of ['trackClicked', 'trackSubscribed']) {
    it(`content ${method} awaits the controller and resolves with no body`, async function () {
      const operation = sandbox.stub().resolves({ tracked: true });
      sandbox.stub(recommendations, 'service').get(() => ({ controller: { [method]: operation } }));

      assert.equal(await contentEndpoint[method].query(frame), undefined);

      sinon.assert.calledOnceWithExactly(operation, frame);
    });
  }
});
