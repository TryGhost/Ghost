import assert from 'node:assert/strict';
// @ts-expect-error This module lacks type definitions.
import serializers from '../../../../../../../core/server/api/endpoints/utils/serializers';

describe('Unit: endpoints/utils/serializers/input/members', function () {
  describe('all', function () {
    it('converts tiers include', function () {
      const apiConfig = {};
      const frame = {
        options: {
          context: {},
          withRelated: ['tiers'],
        },
      };

      serializers.input.members.all(apiConfig, frame);
      assert(frame.options.withRelated.includes('products'));
    });
  });

  describe('browse', function () {
    type BrowseFrame = {
      options: {
        skip_pagination?: string;
        skipPagination?: boolean;
      };
    };

    it('maps skip_pagination=true to skipPagination', function () {
      const frame: BrowseFrame = { options: { skip_pagination: 'true' } };

      serializers.input.members.browse({}, frame);

      assert.equal(frame.options.skipPagination, true);
      assert.equal('skip_pagination' in frame.options, false);
    });

    it('maps skip_pagination=false to skipPagination', function () {
      const frame: BrowseFrame = { options: { skip_pagination: 'false' } };

      serializers.input.members.browse({}, frame);

      assert.equal(frame.options.skipPagination, false);
      assert.equal('skip_pagination' in frame.options, false);
    });

    it('maps skip_pagination regardless of case', function () {
      const frame: BrowseFrame = { options: { skip_pagination: 'TRUE' } };

      serializers.input.members.browse({}, frame);

      assert.equal(frame.options.skipPagination, true);
    });

    it('leaves skipPagination unset without skip_pagination', function () {
      const frame: BrowseFrame = { options: {} };

      serializers.input.members.browse({}, frame);

      assert.equal('skipPagination' in frame.options, false);
    });
  });

  describe('bulkDestroy', function () {
    it('rejects restricted filters while preserving subscribed mapping', function () {
      const transformerCalls: unknown[] = [];
      const frame: {
        options: {
          mongoTransformer?: (input: unknown) => unknown;
        };
      } = {
        options: {
          mongoTransformer(input: unknown) {
            transformerCalls.push(input);
            return input;
          },
        },
      };

      serializers.input.members.bulkDestroy({}, frame);
      const { mongoTransformer } = frame.options;
      assert(mongoTransformer);

      assert.throws(() => mongoTransformer({ password: 'guess' }), {
        name: 'BadRequestError',
      });
      assert.deepEqual(transformerCalls, []);
      assert.deepEqual(mongoTransformer({ subscribed: true }), {
        'newsletters.status': 'active',
      });
      assert.deepEqual(transformerCalls, [{ subscribed: true }]);
    });
  });
});
