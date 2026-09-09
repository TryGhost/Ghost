import * as errors from '@tryghost/errors';
import assert from 'node:assert/strict';
import sinon from 'sinon';
import type { SinonStub } from 'sinon';
import * as shared from '../src/index.ts';

describe('Pipeline', function () {
  let validationInputStub: SinonStub;
  let serialisationInputStub: SinonStub;
  let serialisationOutputStub: SinonStub;
  let permissionsStub: SinonStub;
  let queryStub: SinonStub;
  afterEach(function () {
    sinon.restore();
  });

  describe('stages', function () {
    describe('validation', function () {
      describe('input', function () {
        let validatorsInputStub: SinonStub;

        beforeEach(function () {
          validatorsInputStub = sinon.stub(shared.validators.handle, 'input').resolves();
        });

        it('do it yourself', function () {
          const apiUtils = {};
          const apiConfig = { docName: '', method: '' };
          const apiImpl = {
            validation: sinon.stub().resolves('response'),
          };
          const frame = new shared.Frame();

          return shared.pipeline.STAGES.validation
            .input(apiUtils, apiConfig, apiImpl, frame)
            .then((response) => {
              assert.equal(response, 'response');

              assert.equal(apiImpl.validation.calledOnce, true);
              assert.equal(validatorsInputStub.called, false);
            });
        });

        it('default', function () {
          const apiUtils = {
            validators: {
              input: {
                posts: {},
              },
            },
          };
          const apiConfig = {
            docName: 'posts',
          };
          const apiImpl = {
            options: ['include'],
            validation: {
              options: {
                include: {
                  required: true,
                },
              },
            },
          };
          const frame = new shared.Frame();

          return shared.pipeline.STAGES.validation
            .input(apiUtils, apiConfig, apiImpl, frame)
            .then(() => {
              assert.equal(validatorsInputStub.calledOnce, true);
              assert.equal(
                validatorsInputStub.calledWith(
                  {
                    docName: 'posts',
                    options: {
                      include: {
                        required: true,
                      },
                    },
                  },
                  {
                    posts: {},
                  },
                  frame,
                ),
                true,
              );
            });
        });
      });
    });

    describe('serialisation', function () {
      it('input calls shared serializer input handler', function () {
        const serializersInputStub = sinon.stub(shared.serializers.handle, 'input').resolves();

        const apiUtils = { serializers: { input: { posts: {} } } };
        const apiConfig = { docName: 'posts', method: 'browse' };
        const apiImpl = { data: ['id'] };
        const frame = new shared.Frame();

        return shared.pipeline.STAGES.serialisation
          .input(apiUtils, apiConfig, apiImpl, frame)
          .then(() => {
            assert.equal(serializersInputStub.calledOnce, true);
            assert.deepEqual(serializersInputStub.firstCall.firstArg, {
              data: ['id'],
              docName: 'posts',
              method: 'browse',
            });
          });
      });

      it('output calls shared serializer output handler', function () {
        const serializersOutputStub = sinon.stub(shared.serializers.handle, 'output').resolves();

        const apiUtils = { serializers: { output: { posts: {} } } };
        const apiConfig = { docName: 'posts', method: 'browse' };
        const apiImpl = {};
        const frame = new shared.Frame();
        const response = [{ id: '1' }];

        return shared.pipeline.STAGES.serialisation
          .output(response, apiUtils, apiConfig, apiImpl, frame)
          .then(() => {
            assert.equal(
              serializersOutputStub.calledOnceWithExactly(
                response,
                apiConfig,
                apiUtils.serializers.output,
                frame,
              ),
              true,
            );
          });
      });
    });

    describe('permissions', function () {
      let apiUtils = createApiUtils();

      function createApiUtils() {
        return { permissions: { handle: sinon.stub().resolves() } };
      }

      beforeEach(function () {
        apiUtils = createApiUtils();
      });

      it('key is missing', function () {
        const apiConfig = { docName: '', method: '' };
        const apiImpl = {};
        const frame = new shared.Frame();

        return shared.pipeline.STAGES.permissions(apiUtils, apiConfig, apiImpl, frame)
          .then(Promise.reject)
          .catch((err) => {
            assert.equal(err instanceof errors.IncorrectUsageError, true);
            assert.equal(apiUtils.permissions.handle.called, false);
          });
      });

      it('do it yourself', function () {
        const apiConfig = { docName: '', method: '' };
        const apiImpl = {
          permissions: sinon.stub().resolves('lol'),
        };
        const frame = new shared.Frame();

        return shared.pipeline.STAGES.permissions(apiUtils, apiConfig, apiImpl, frame).then(
          (response) => {
            assert.equal(response, 'lol');
            assert.equal(apiImpl.permissions.calledOnce, true);
            assert.equal(apiUtils.permissions.handle.called, false);
          },
        );
      });

      it('skip stage', function () {
        const apiConfig = { docName: '', method: '' };
        const apiImpl = {
          permissions: false,
        };
        const frame = new shared.Frame();

        return shared.pipeline.STAGES.permissions(apiUtils, apiConfig, apiImpl, frame).then(() => {
          assert.equal(apiUtils.permissions.handle.called, false);
        });
      });

      it('default', function () {
        const apiConfig = { docName: '', method: '' };
        const apiImpl = {
          permissions: true,
        };
        const frame = new shared.Frame();

        return shared.pipeline.STAGES.permissions(apiUtils, apiConfig, apiImpl, frame).then(() => {
          assert.equal(apiUtils.permissions.handle.calledOnce, true);
        });
      });

      it('with permission config', function () {
        const apiConfig = {
          docName: 'posts',
        };
        const apiImpl = {
          permissions: {
            unsafeAttrs: ['test'],
          },
        };
        const frame = new shared.Frame();

        return shared.pipeline.STAGES.permissions(apiUtils, apiConfig, apiImpl, frame).then(() => {
          assert.equal(apiUtils.permissions.handle.calledOnce, true);
          assert.equal(
            apiUtils.permissions.handle.calledWith(
              {
                docName: 'posts',
                unsafeAttrs: ['test'],
              },
              frame,
            ),
            true,
          );
        });
      });

      it('runs permission before hook', function () {
        const before = sinon.stub().resolves();
        const apiConfig = { docName: '', method: '' };
        const apiImpl = {
          permissions: {
            before,
          },
        };
        const frame = new shared.Frame();

        return shared.pipeline.STAGES.permissions(apiUtils, apiConfig, apiImpl, frame).then(() => {
          assert.equal(before.calledOnceWithExactly(frame), true);
          assert.equal(apiUtils.permissions.handle.calledOnce, true);
        });
      });
    });

    describe('query', function () {
      it('throws when query method is missing', function () {
        return shared.pipeline.STAGES.query({}, {}, {}, new shared.Frame())
          .then(Promise.reject)
          .catch((err) => {
            assert.equal(err instanceof errors.IncorrectUsageError, true);
          });
      });

      it('runs query when configured', function () {
        const query = sinon.stub().resolves('result');
        const frame = new shared.Frame();
        return shared.pipeline.STAGES.query({}, {}, { query }, frame).then((result) => {
          assert.equal(result, 'result');
          assert.equal(query.calledOnceWithExactly(frame), true);
        });
      });
    });
  });

  describe('pipeline', function () {
    beforeEach(function () {
      validationInputStub = sinon.stub(shared.pipeline.STAGES.validation, 'input');
      serialisationInputStub = sinon.stub(shared.pipeline.STAGES.serialisation, 'input');
      serialisationOutputStub = sinon.stub(shared.pipeline.STAGES.serialisation, 'output');
      permissionsStub = sinon.stub(shared.pipeline.STAGES, 'permissions');
      queryStub = sinon.stub(shared.pipeline.STAGES, 'query');
    });

    it('ensure we receive a callable api controller fn', function () {
      const apiController = {
        add: {},
        browse: {},
      };

      const apiUtils = {};

      const result = shared.pipeline(apiController, apiUtils);
      assert.equal(typeof result, 'object');

      assert.ok(result.add);
      assert.ok(result.browse);
      assert.equal(typeof result.add, 'function');
      assert.equal(typeof result.browse, 'function');
    });

    it('call api controller fn', function () {
      const apiController = {
        add: {},
      };

      const apiUtils = {};
      const result = shared.pipeline(apiController, apiUtils);

      validationInputStub.resolves();
      serialisationInputStub.resolves();
      permissionsStub.resolves();
      queryStub.resolves('response');
      serialisationOutputStub.callsFake(
        function (response, _apiUtils, _apiConfig, _apiImpl, frame) {
          frame.response = response;
        },
      );

      return result.add().then((response) => {
        assert.equal(response, 'response');

        assert.equal(validationInputStub.calledOnce, true);
        assert.equal(serialisationInputStub.calledOnce, true);
        assert.equal(permissionsStub.calledOnce, true);
        assert.equal(queryStub.calledOnce, true);
        assert.equal(serialisationOutputStub.calledOnce, true);
      });
    });

    it('supports data and options arguments', function () {
      const apiController = {
        docName: 'posts',
        add: {
          headers: {},
          permissions: true,
          query: sinon.stub().resolves('response'),
        },
      };

      const apiUtils = {};
      const result = shared.pipeline(apiController, apiUtils);

      validationInputStub.resolves();
      serialisationInputStub.resolves();
      permissionsStub.resolves();
      queryStub.resolves('response');
      serialisationOutputStub.callsFake(
        function (response, _apiUtils, _apiConfig, _apiImpl, frame) {
          frame.response = response;
        },
      );

      return result.add({ posts: [{ title: 't' }] }, { context: { internal: true } }).then(() => {
        const frame = validationInputStub.firstCall.args[3];
        assert.ok(frame instanceof shared.Frame);
        assert.deepEqual(frame.data, { posts: [{ title: 't' }] });
        assert.deepEqual(frame.options.context, { internal: true });
      });
    });

    it('supports single undefined argument by defaulting options', function () {
      const apiController = {
        docName: 'posts',
        add: {
          headers: {},
          permissions: true,
          query: sinon.stub().resolves('response'),
        },
      };

      const apiUtils = {};
      const result = shared.pipeline(apiController, apiUtils);

      validationInputStub.resolves();
      serialisationInputStub.resolves();
      permissionsStub.resolves();
      queryStub.resolves('response');
      serialisationOutputStub.callsFake(
        function (response, _apiUtils, _apiConfig, _apiImpl, frame) {
          frame.response = response;
        },
      );

      return result.add(undefined).then(() => {
        const frame = validationInputStub.firstCall.args[3];
        assert.ok(frame instanceof shared.Frame);
        assert.deepEqual(frame.options.context, {});
      });
    });

    it('api controller is fn, not config', function () {
      const apiController = {
        add() {
          return Promise.resolve('response');
        },
      };

      const apiUtils = {};
      const result = shared.pipeline(apiController, apiUtils);

      return result.add().then((response) => {
        assert.equal(response, 'response');

        assert.equal(validationInputStub.called, false);
        assert.equal(serialisationInputStub.called, false);
        assert.equal(permissionsStub.called, false);
        assert.equal(queryStub.called, false);
        assert.equal(serialisationOutputStub.called, false);
      });
    });

    it('uses existing frame instance and generateCacheKeyData', async function () {
      const apiController = {
        browse: {
          headers: {},
          permissions: true,
          generateCacheKeyData: sinon.stub().resolves({ custom: 'key' }),
          query: sinon.stub().resolves('response'),
        },
      };

      const apiUtils = {};
      const result = shared.pipeline(apiController, apiUtils, 'content');
      const frame = new shared.Frame();

      validationInputStub.resolves();
      serialisationInputStub.resolves();
      permissionsStub.resolves();
      queryStub.resolves('response');
      serialisationOutputStub.callsFake(
        function (response, _apiUtils, _apiConfig, _apiImpl, frameArg) {
          frameArg.response = response;
        },
      );

      const response = await result.browse(frame);

      assert.equal(response, 'response');
      assert.equal(apiController.browse.generateCacheKeyData.calledOnceWithExactly(frame), true);
      assert.equal(frame.apiType, 'content');
      assert.equal(frame.docName, undefined);
      assert.equal(frame.method, 'browse');
    });

    it('returns cached controller wrapper for same controller object', function () {
      const apiController = {
        docName: 'posts',
        browse: {
          headers: {},
          permissions: true,
          query: sinon.stub().resolves('response'),
        },
      };

      const first = shared.pipeline(apiController, {});
      const second = shared.pipeline(apiController, {});

      assert.equal(first, second);
    });
  });

  describe('caching', function () {
    beforeEach(function () {
      validationInputStub = sinon.stub(shared.pipeline.STAGES.validation, 'input');
      serialisationInputStub = sinon.stub(shared.pipeline.STAGES.serialisation, 'input');
      serialisationOutputStub = sinon.stub(shared.pipeline.STAGES.serialisation, 'output');
      permissionsStub = sinon.stub(shared.pipeline.STAGES, 'permissions');
      queryStub = sinon.stub(shared.pipeline.STAGES, 'query');
    });

    it('should set a cache if configured on endpoint level', async function () {
      const apiController = {
        browse: {
          cache: {
            get: sinon.stub().resolves(null),
            set: sinon.stub().resolves(true),
          },
        },
      };

      const apiUtils = {};
      const result = shared.pipeline(apiController, apiUtils);

      validationInputStub.resolves();
      serialisationInputStub.resolves();
      permissionsStub.resolves();
      queryStub.resolves('response');
      serialisationOutputStub.callsFake(
        function (response, _apiUtils, _apiConfig, _apiImpl, frame) {
          frame.response = response;
        },
      );

      const response = await result.browse();

      assert.equal(response, 'response');

      // request went through all stages
      assert.equal(validationInputStub.calledOnce, true);
      assert.equal(serialisationInputStub.calledOnce, true);
      assert.equal(permissionsStub.calledOnce, true);
      assert.equal(queryStub.calledOnce, true);
      assert.equal(serialisationOutputStub.calledOnce, true);

      // cache was set
      assert.equal(apiController.browse.cache.set.calledOnce, true);
      assert.equal(apiController.browse.cache.set.firstCall.args[1], 'response');
    });

    it('should use cache if configured on endpoint level', async function () {
      const apiController = {
        browse: {
          cache: {
            get: sinon.stub().resolves('CACHED RESPONSE'),
            set: sinon.stub().resolves(true),
          },
        },
      };

      const apiUtils = {};
      const result = shared.pipeline(apiController, apiUtils);

      validationInputStub.resolves();
      serialisationInputStub.resolves();
      permissionsStub.resolves();
      queryStub.resolves('response');
      serialisationOutputStub.callsFake(
        function (response, _apiUtils, _apiConfig, _apiImpl, frame) {
          frame.response = response;
        },
      );

      const response = await result.browse();

      assert.equal(response, 'CACHED RESPONSE');

      // request went through all stages
      assert.equal(validationInputStub.calledOnce, false);
      assert.equal(serialisationInputStub.calledOnce, false);
      assert.equal(permissionsStub.calledOnce, false);
      assert.equal(queryStub.calledOnce, false);
      assert.equal(serialisationOutputStub.calledOnce, false);

      // cache not set
      assert.equal(apiController.browse.cache.set.calledOnce, false);
    });

    it('produces distinct cache keys when cacheKeyData objects differ only in nested fields', async function () {
      const cache = {
        get: sinon.stub().resolves(null),
        set: sinon.stub().resolves(true),
      };

      const apiController = {
        browse: {
          cache,
          generateCacheKeyData: sinon.stub(),
        },
      };

      const apiUtils = {};
      const result = shared.pipeline(apiController, apiUtils);

      validationInputStub.resolves();
      serialisationInputStub.resolves();
      permissionsStub.resolves();
      queryStub.resolves('response');
      serialisationOutputStub.callsFake(
        function (response, _apiUtils, _apiConfig, _apiImpl, frame) {
          frame.response = response;
        },
      );

      // Two requests that share every top-level key but differ deep inside
      // a nested object must not collide. Top-level keys are identical on
      // purpose — that is what the replacer-array form silently dropped.
      apiController.browse.generateCacheKeyData.onFirstCall().resolves({
        options: { filter: 'status:published', limit: 15 },
        auth: { free: true, tiers: [] },
        method: 'browse',
      });
      apiController.browse.generateCacheKeyData.onSecondCall().resolves({
        options: { filter: 'status:published', limit: 15 },
        auth: { free: false, tiers: ['gold'] },
        method: 'browse',
      });

      await result.browse();
      await result.browse();

      const firstKey = cache.get.firstCall.args[0];
      const secondKey = cache.get.secondCall.args[0];

      assert.notEqual(
        firstKey,
        secondKey,
        'nested-field differences must produce distinct cache keys',
      );
    });

    it('produces identical cache keys when cacheKeyData objects are reordered at any depth', async function () {
      const cache = {
        get: sinon.stub().resolves(null),
        set: sinon.stub().resolves(true),
      };

      const apiController = {
        browse: {
          cache,
          generateCacheKeyData: sinon.stub(),
        },
      };

      const apiUtils = {};
      const result = shared.pipeline(apiController, apiUtils);

      validationInputStub.resolves();
      serialisationInputStub.resolves();
      permissionsStub.resolves();
      queryStub.resolves('response');
      serialisationOutputStub.callsFake(
        function (response, _apiUtils, _apiConfig, _apiImpl, frame) {
          frame.response = response;
        },
      );

      // Same logical payload, keys inserted in different orders at every
      // depth (top-level, options, auth, and an object nested inside an
      // array). Insertion order must not affect the cache key.
      apiController.browse.generateCacheKeyData.onFirstCall().resolves({
        options: { filter: 'status:published', limit: 15 },
        auth: { free: false, tiers: [{ slug: 'gold', order: 1 }] },
        method: 'browse',
      });
      apiController.browse.generateCacheKeyData.onSecondCall().resolves({
        method: 'browse',
        auth: { tiers: [{ order: 1, slug: 'gold' }], free: false },
        options: { limit: 15, filter: 'status:published' },
      });

      await result.browse();
      await result.browse();

      const firstKey = cache.get.firstCall.args[0];
      const secondKey = cache.get.secondCall.args[0];

      assert.equal(firstKey, secondKey, 'key insertion order must not affect the cache key');
    });
  });
});
