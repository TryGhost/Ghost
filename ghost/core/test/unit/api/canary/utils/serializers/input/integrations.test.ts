import assert from 'node:assert/strict';
// @ts-expect-error This module lacks type definitions.
import serializers from '../../../../../../../core/server/api/endpoints/utils/serializers';

type Frame = {
  options: {
    filter?: string;
    context: Record<string, never>;
  };
};

describe('Unit: endpoints/utils/serializers/input/pages', function () {
  describe('browse', function () {
    it('default', function () {
      const apiConfig = {};
      const frame: Frame = {
        options: {
          context: {},
        },
      };

      serializers.input.integrations.browse(apiConfig, frame);
      assert.equal(frame.options.filter, 'type:[custom,builtin,core]');
    });

    it('combines filters', function () {
      const apiConfig = {};
      const frame: Frame = {
        options: {
          filter: 'type:internal',
          context: {},
        },
      };

      serializers.input.integrations.browse(apiConfig, frame);
      assert.equal(frame.options.filter, '(type:internal)+type:[custom,builtin,core]');
    });
  });

  describe('read', function () {
    it('default', function () {
      const apiConfig = {};
      const frame: Frame = {
        options: {
          context: {},
        },
      };

      serializers.input.integrations.read(apiConfig, frame);
      assert.equal(frame.options.filter, 'type:[custom,builtin,core]');
    });

    it('combines filters', function () {
      const apiConfig = {};
      const frame: Frame = {
        options: {
          filter: 'type:internal',
          context: {},
        },
      };

      serializers.input.integrations.read(apiConfig, frame);
      assert.equal(frame.options.filter, '(type:internal)+type:[custom,builtin,core]');
    });
  });
});
