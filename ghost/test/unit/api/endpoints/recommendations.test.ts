import assert from 'node:assert/strict';
import sinon from 'sinon';

const recommendations = require('../../../../core/server/services/recommendations');
const adminEndpoint = require('../../../../core/server/api/endpoints/recommendations');
const contentEndpoint = require('../../../../core/server/api/endpoints/recommendations-public');
const incomingEndpoint = require('../../../../core/server/api/endpoints/incoming-recommendations');

// Each endpoint reads the wrapper field when a request arrives, so it sees whatever the root
// has published by then.
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
      it(`${name} ${method} rejects before the root publishes its ${field}`, async function () {
        assert.equal(recommendations[field], undefined);

        await assert.rejects(
          Promise.resolve().then(() => endpoint[method].query(frame)),
          TypeError,
        );
      });

      it(`${name} ${method} forwards the frame to the ${field} read at request time`, async function () {
        const result = { data: [] };
        const operation = sandbox.stub().resolves(result);
        sandbox.stub(recommendations, field).value({ [method]: operation });

        assert.equal(await endpoint[method].query(frame), result);

        sinon.assert.calledOnceWithExactly(operation, frame);
      });
    }
  }

  for (const method of ['trackClicked', 'trackSubscribed']) {
    it(`content ${method} awaits the controller and resolves with no body`, async function () {
      const operation = sandbox.stub().resolves({ tracked: true });
      sandbox.stub(recommendations, 'controller').value({ [method]: operation });

      assert.equal(await contentEndpoint[method].query(frame), undefined);

      sinon.assert.calledOnceWithExactly(operation, frame);
    });
  }
});
