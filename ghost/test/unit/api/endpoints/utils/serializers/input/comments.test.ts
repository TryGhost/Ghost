import assert from 'node:assert/strict';
import sinon from 'sinon';
// @ts-expect-error This module lacks type definitions.
import serializers from '../../../../../../../core/server/api/endpoints/utils/serializers';
// @ts-expect-error This module lacks type definitions.
import urlService from '../../../../../../../core/server/services/url';

describe('Unit: endpoints/utils/serializers/input/comments', function () {
  afterEach(function () {
    sinon.restore();
  });

  describe('all', function () {
    it('converts member reaction includes to count relations', function () {
      const apiConfig = {};
      const frame = {
        options: {
          context: {},
          withRelated: ['liked', 'disliked', 'replies.liked', 'replies.disliked', 'member'],
        },
      };

      serializers.input.comments.all(apiConfig, frame);

      assert.deepEqual(frame.options.withRelated, [
        'count.liked',
        'count.disliked',
        'replies.count.liked',
        'replies.count.disliked',
        'member',
      ]);
    });

    it('loads the post routing relations the live routes reference when post is included', function () {
      sinon
        .stub(Object.getPrototypeOf(urlService), 'getRequiredRelations')
        .returns(['tags', 'authors']);

      const apiConfig = {};
      const frame = {
        options: {
          context: {},
          withRelated: ['post'],
        },
      };

      serializers.input.comments.all(apiConfig, frame);

      assert.deepEqual(frame.options.withRelated, ['post', 'post.tags', 'post.authors']);
    });

    it('loads no post relations when no route references tags or authors', function () {
      sinon.stub(Object.getPrototypeOf(urlService), 'getRequiredRelations').returns([]);

      const apiConfig = {};
      const frame = {
        options: {
          context: {},
          withRelated: ['post'],
        },
      };

      serializers.input.comments.all(apiConfig, frame);

      assert.deepEqual(frame.options.withRelated, ['post']);
    });
  });
});
