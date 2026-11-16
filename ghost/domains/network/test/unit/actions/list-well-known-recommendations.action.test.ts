import assert from 'node:assert/strict';
import { IncorrectUsageError } from '@tryghost/errors';
import sinon from 'sinon';

const root = require('../../../services/recommendations').default;
const {
  listWellKnownRecommendations,
} = require('../../../actions/list-well-known-recommendations.action');

describe('listWellKnownRecommendations', function () {
  afterEach(function () {
    sinon.restore();
  });

  it('can be imported before the domain has started, and fails only when called', function () {
    assert.throws(() => root.service, IncorrectUsageError);
    assert.throws(() => listWellKnownRecommendations(), IncorrectUsageError);
  });

  it('returns the well-known list as plain data from the service read when it is called', async function () {
    const list = [
      {
        url: 'https://example.com/',
        updated_at: '2026-01-02T00:00:00.000Z',
        created_at: '2026-01-01T00:00:00.000Z',
      },
    ];
    sinon
      .stub(root, 'service')
      .get(() => ({ service: { getWellknownRecommendations: async () => list } }));

    assert.deepEqual(await listWellKnownRecommendations(), list);
  });
});
