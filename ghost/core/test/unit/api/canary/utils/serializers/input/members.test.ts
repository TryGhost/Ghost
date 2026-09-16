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
