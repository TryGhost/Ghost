const assert = require('node:assert/strict');
const sinon = require('sinon');
const models = require('../../../../../core/server/models');
const listeners = require('../../../../../core/server/models/base/listeners');

function createScheduledPost(id, publishedAt) {
  const attributes = {
    id,
    status: 'scheduled',
    published_at: new Date(publishedAt),
  };

  return {
    id,
    attributes,
    get: (key) => attributes[key],
    set: (key, value) => {
      attributes[key] = value;
    },
    toJSON: () => ({ ...attributes }),
  };
}

describe('base model listeners', function () {
  it('preserves scheduled wall time using the target date DST offset', async function () {
    const clock = sinon.useFakeTimers({
      now: new Date('2026-10-21T12:00:00.000Z'),
      toFake: ['Date'],
    });

    try {
      const fixtures = [
        {
          id: 'winter',
          publishedAt: '2027-01-15T10:00:00.000Z',
          expectedPublishedAt: '2027-01-15T15:00:00.000Z',
        },
        {
          id: 'spring-gap',
          publishedAt: '2027-03-14T02:30:00.000Z',
          expectedPublishedAt: '2027-03-14T07:30:00.000Z',
        },
        {
          id: 'fall-overlap',
          publishedAt: '2027-11-07T01:30:00.000Z',
          expectedPublishedAt: '2027-11-07T05:30:00.000Z',
        },
      ];
      const posts = fixtures.map((fixture) => createScheduledPost(fixture.id, fixture.publishedAt));
      const transacting = { id: 'transaction' };
      const handlers = new Map();
      const emitter = {
        on: (eventName, callback) => {
          handlers.set(eventName, callback);
        },
      };
      const transactionStub = sinon.stub(models.Base, 'transaction').callsFake(async (callback) => {
        return callback(transacting);
      });
      const findScheduledPostsStub = sinon.stub(models.Post, 'findAll').resolves(posts);
      const editPostStub = sinon.stub(models.Post, 'edit').resolves();

      listeners.registerListeners(emitter);

      const timezoneEdited = handlers.get('settings.timezone.edited');
      assert.equal(typeof timezoneEdited, 'function');
      await timezoneEdited({
        attributes: { value: 'America/New_York' },
        _previousAttributes: { value: 'Etc/UTC' },
      });

      sinon.assert.calledOnce(transactionStub);
      sinon.assert.calledOnceWithExactly(findScheduledPostsStub, {
        filter: 'status:scheduled',
        context: { internal: true },
        transacting,
        forUpdate: true,
      });
      assert.equal(editPostStub.callCount, fixtures.length);

      for (const fixture of fixtures) {
        const post = posts.find((candidate) => candidate.id === fixture.id);
        assert.equal(post.attributes.status, 'scheduled');
        assert.equal(post.attributes.published_at.toISOString(), fixture.expectedPublishedAt);
      }
    } finally {
      clock.restore();
      sinon.restore();
    }
  });
});
