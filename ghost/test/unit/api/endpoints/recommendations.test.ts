import assert from 'node:assert/strict';
import sinon from 'sinon';
import type { Site } from '#support/site';

// Loaded with require, as the endpoints load them, so both see one copy of each class.
const {
  IncomingRecommendationController,
}: typeof import('../../../../domains/network/http/incoming-recommendation.controller') = require('../../../../domains/network/http/incoming-recommendation.controller');
const {
  RecommendationController,
}: typeof import('../../../../domains/network/http/recommendation.controller') = require('../../../../domains/network/http/recommendation.controller');

const adminEndpoint = require('../../../../core/server/api/endpoints/recommendations');
const contentEndpoint = require('../../../../core/server/api/endpoints/recommendations-public');
const incomingEndpoint = require('../../../../core/server/api/endpoints/incoming-recommendations');

// Each endpoint is handed the site with the frame, and gives the frame to the controller for that site.
type Endpoint = Record<string, { query(frame: object, site: Site): Promise<unknown> }>;
type Controller = { prototype: Record<string, unknown> };
type Forwarded = [name: string, endpoint: Endpoint, controller: Controller, methods: string[]];

const forwarded: Forwarded[] = [
  [
    'admin',
    adminEndpoint,
    RecommendationController as unknown as Controller,
    ['browse', 'read', 'add', 'check', 'edit', 'destroy'],
  ],
  ['content', contentEndpoint, RecommendationController as unknown as Controller, ['browse']],
  [
    'incoming',
    incomingEndpoint,
    IncomingRecommendationController as unknown as Controller,
    ['browse'],
  ],
];

describe('Recommendations endpoints', function () {
  const sandbox = sinon.createSandbox();
  const frame = { options: { id: 'recommendation-id' }, data: {} };
  const site = { log: {} } as Site;

  afterEach(function () {
    sandbox.restore();
  });

  for (const [name, endpoint, controller, methods] of forwarded) {
    for (const method of methods) {
      it(`${name} ${method} gives the frame to the controller and answers with its result`, async function () {
        const result = { data: [] };
        const operation = sandbox.stub(controller.prototype, method).resolves(result);

        assert.equal(await endpoint[method]!.query(frame, site), result);

        sinon.assert.calledOnceWithExactly(operation, frame);
      });
    }
  }

  for (const method of ['trackClicked', 'trackSubscribed'] as const) {
    it(`content ${method} awaits the controller and resolves with no body`, async function () {
      const operation = sandbox
        .stub(RecommendationController.prototype, method)
        .resolves({ tracked: true } as never);

      assert.equal(await (contentEndpoint as Endpoint)[method]!.query(frame, site), undefined);

      sinon.assert.calledOnceWithExactly(operation, frame as never);
    });
  }
});
