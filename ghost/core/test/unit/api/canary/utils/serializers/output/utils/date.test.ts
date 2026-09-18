import assert from 'node:assert/strict';
import sinon from 'sinon';
import settingsCache from '../../../../../../../../core/shared/settings-cache';
import * as dateUtil from '../../../../../../../../core/server/api/endpoints/utils/serializers/output/utils/date';

describe('Unit: endpoints/utils/serializers/output/utils/date', function () {
  afterEach(function () {
    sinon.restore();
  });

  describe('forPost', function () {
    const fields = ['created_at', 'updated_at', 'published_at'] as const;

    const createPost = () => ({
      created_at: '2014-01-01T01:28:58.593Z',
      updated_at: '2014-12-31T23:28:58.123Z',
      published_at: '2014-03-01T01:28:58.593Z',
      ignored_date: '2020-01-01T01:23:45.678Z',
    });

    beforeEach(function () {
      sinon.stub(settingsCache, 'get').returns('Europe/Oslo');
    });

    it('mutates fields with new times', function () {
      const post = createPost();

      dateUtil.forPost(post);

      assert.deepEqual(post, {
        created_at: '2014-01-01T02:28:58.593+01:00',
        updated_at: '2015-01-01T00:28:58.123+01:00',
        published_at: '2014-03-01T02:28:58.593+01:00',
        ignored_date: '2020-01-01T01:23:45.678Z',
      });
    });

    it('skips missing fields', function () {
      for (const field of fields) {
        const post = createPost();
        delete post[field];

        dateUtil.forPost(post);

        const expected = {
          created_at: '2014-01-01T02:28:58.593+01:00',
          updated_at: '2015-01-01T00:28:58.123+01:00',
          published_at: '2014-03-01T02:28:58.593+01:00',
          ignored_date: '2020-01-01T01:23:45.678Z',
        };
        delete expected[field];

        assert.deepEqual(post, expected);
      }
    });

    it('skips null fields', function () {
      for (const field of fields) {
        const post = { ...createPost(), [field]: null };

        dateUtil.forPost(post);

        assert.deepEqual(post, {
          created_at: '2014-01-01T02:28:58.593+01:00',
          updated_at: '2015-01-01T00:28:58.123+01:00',
          published_at: '2014-03-01T02:28:58.593+01:00',
          ignored_date: '2020-01-01T01:23:45.678Z',
          [field]: null,
        });
      }
    });
  });
});
