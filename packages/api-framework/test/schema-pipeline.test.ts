import errors from '@tryghost/errors';
import assert from 'node:assert/strict';
import sinon from 'sinon';
import { z } from 'zod';
import { defineMethod, Frame, http, pipeline } from '../src/index.ts';

const apiUtils = {
  serializers: {
    input: {},
    output: {
      all: {
        before(response: unknown, _apiConfig: unknown, frame: Frame) {
          frame.response = response;
        },
      },
    },
  },
};

describe('schema-aware pipeline', function () {
  it('parses internal options and body with defaults and transforms without legacy validators', async function () {
    const schema = {
      options: z.object({ id: z.string(), page: z.string().transform(Number).default(1) }),
      body: z.object({ title: z.string(), enabled: z.boolean().default(true) }),
    };
    const method = defineMethod({
      schema,
      permissions: false,
      query(frame) {
        assert.equal(frame.options.id, undefined);
        assert.deepEqual(frame.options.context, { internal: true });
        assert.equal(Object.isFrozen(frame.validated), true);
        return frame.validated;
      },
    });
    const controller = pipeline({ docName: 'widgets', add: method }, apiUtils);

    assert.equal(controller.add.schema, schema);
    assert.equal(controller.add.schema.options, schema.options);
    assert.deepEqual(
      await controller.add(
        { title: 'New', extra: 'stripped' },
        {
          id: 'not-a-mongo-id',
          context: { internal: true },
        },
      ),
      {
        options: { id: 'not-a-mongo-id', page: 1 },
        body: { title: 'New', enabled: true },
      },
    );
    assert.deepEqual(
      await controller.add({ title: 'New' }, { id: 'id', page: '2', context: { internal: true } }),
      {
        options: { id: 'id', page: 2 },
        body: { title: 'New', enabled: true },
      },
    );
  });

  it('merges HTTP query, params and options in order, excluding request context', async function () {
    const permissions = sinon.spy();
    const controller = pipeline(
      {
        docName: 'widgets',
        read: defineMethod({
          schema: { options: z.strictObject({ id: z.string(), page: z.coerce.number() }) },
          permissions: {
            before(frame) {
              assert.deepEqual(frame.validated.options, { id: 'param', page: 2 });
              assert.equal(frame.options.context?.user, 'staff');
            },
          },
          query(frame) {
            return frame.validated.options;
          },
        }),
      },
      { ...apiUtils, permissions: { handle: permissions } },
    );
    const req = {
      get: () => 'example.com',
      url: '/widgets/param/',
      user: { id: 'staff' },
      query: { id: 'query', page: '2', context: { user: 'untrusted' } },
      params: { id: 'param' },
    };
    const res = { json: sinon.spy(), send: sinon.spy(), status: sinon.spy(), set: sinon.spy() };
    const next = sinon.spy();

    await http(controller.read)(req, res, next);
    assert.equal(next.called, false);
    assert.equal(permissions.calledOnce, true);
    assert.deepEqual(res.json.firstCall.firstArg, { id: 'param', page: 2 });

    const requestFrame = new Frame({
      query: { id: 'query', page: '1' },
      params: { id: 'param' },
      options: { id: 'internal', page: '3', context: {} },
    });
    const internal = pipeline(
      {
        read: defineMethod({
          schema: { options: z.strictObject({ id: z.string(), page: z.coerce.number() }) },
          permissions: false,
          query(frame) {
            return frame.validated.options;
          },
        }),
      },
      apiUtils,
    );
    assert.deepEqual(await internal.read(requestFrame), { id: 'internal', page: 3 });
  });

  it('validates the original body rather than data populated from options', async function () {
    const read = defineMethod({
      data: ['id'],
      schema: { body: z.object({ title: z.string() }).default({ title: 'default' }) },
      permissions: false,
      query(frame) {
        assert.deepEqual(frame.data, { id: 'id' });
        return frame.validated.body;
      },
    });
    const controller = pipeline({ read }, apiUtils);
    assert.deepEqual(await controller.read({ id: 'id' }), { title: 'default' });
    await assert.rejects(controller.read({}, { id: 'id' }), errors.ValidationError);
  });

  it('reports invalid options with their channel and path before any callback', async function () {
    const query = sinon.spy();
    const validation = sinon.spy();
    const cache = { get: sinon.stub().resolves('cached'), set: sinon.spy() };
    const generateCacheKeyData = sinon.spy();
    const permissions = sinon.spy();
    const controller = pipeline(
      {
        read: defineMethod({
          schema: { options: z.object({ id: z.string() }) },
          validation,
          generateCacheKeyData,
          permissions,
          query,
          cache,
        }),
      },
      apiUtils,
    );
    await assert.rejects(controller.read({ id: 123 }), (error: unknown) => {
      assert.ok(error instanceof errors.ValidationError);
      assert.equal(error.statusCode, 422);
      assert.equal(error.property, 'options.id');
      assert.deepEqual(error.errorDetails[0].path, ['options', 'id']);
      return true;
    });
    for (const callback of [validation, generateCacheKeyData, permissions, query, cache.get]) {
      assert.equal(callback.called, false);
    }
  });

  it('passes body validation errors to HTTP next with method metadata', async function () {
    const query = sinon.spy();
    const controller = pipeline(
      {
        docName: 'widgets',
        add: defineMethod({
          schema: { body: z.object({ widgets: z.array(z.object({ title: z.string() })) }) },
          permissions: false,
          query,
        }),
      },
      apiUtils,
    );
    const req = {
      get: () => 'example.com',
      url: '/widgets/',
      body: { widgets: [{ title: 5 }] },
      frameOptions: undefined as
        | { docName: string | null | undefined; method: string | null }
        | undefined,
    };
    const res = { json: sinon.spy(), send: sinon.spy(), status: sinon.spy(), set: sinon.spy() };
    const next = sinon.spy();
    await http(controller.add)(req, res, next);
    const error = next.firstCall.firstArg;
    assert.ok(error instanceof errors.ValidationError);
    assert.equal(error.property, 'body.widgets.0.title');
    assert.deepEqual(error.errorDetails[0].path, ['body', 'widgets', 0, 'title']);
    assert.deepEqual(req.frameOptions, { docName: 'widgets', method: 'add' });
    assert.equal(res.json.called, false);
    assert.equal(query.called, false);
  });

  it('runs parsing and custom validation once before cache-key generation on every cache hit', async function () {
    const calls: string[] = [];
    const cache = {
      get() {
        calls.push('cache');
        return 'cached';
      },
      set: sinon.spy(),
    };
    const query = sinon.spy();
    const controller = pipeline(
      {
        read: defineMethod({
          schema: {
            options: z.object({
              id: z.string().transform(async (id) => {
                calls.push('parse');
                return id.toUpperCase();
              }),
            }),
          },
          validation(frame) {
            calls.push('validation');
            assert.equal(frame.validated.options.id, 'ID');
          },
          generateCacheKeyData(frame) {
            calls.push('key');
            return frame.validated.options;
          },
          permissions: false,
          query,
          cache,
        }),
      },
      apiUtils,
    );
    assert.equal(await controller.read({ id: 'id' }), 'cached');
    assert.equal(await controller.read({ id: 'id' }), 'cached');
    assert.deepEqual(calls, [
      'parse',
      'validation',
      'key',
      'cache',
      'parse',
      'validation',
      'key',
      'cache',
    ]);
    assert.equal(query.called, false);
  });

  it('does not consult the cache when custom validation rejects parsed input', async function () {
    const error = new errors.ValidationError({ message: 'Custom validation' });
    const cache = { get: sinon.spy(), set: sinon.spy() };
    const controller = pipeline(
      {
        read: defineMethod({
          schema: { options: z.object({ id: z.string() }) },
          validation() {
            throw error;
          },
          permissions: false,
          query() {},
          cache,
        }),
      },
      apiUtils,
    );
    await assert.rejects(controller.read({ id: 'id' }), (actual) => actual === error);
    assert.equal(cache.get.called, false);
  });

  it('uses parsed options, body and trusted context in the default cache key', async function () {
    const cache = { get: sinon.stub().resolves('cached'), set: sinon.spy() };
    const controller = pipeline(
      {
        add: defineMethod({
          schema: {
            options: z.object({ page: z.coerce.number().default(1) }),
            body: z.object({ title: z.string() }),
          },
          permissions: false,
          query() {},
          cache,
        }),
      },
      apiUtils,
    );
    await controller.add({ title: 'first' }, { page: '1', context: { user: 'one' } });
    await controller.add({ title: 'first' }, { context: { user: 'one' } });
    await controller.add({ title: 'second' }, { context: { user: 'one' } });
    await controller.add({ title: 'first' }, { context: { user: 'two' } });
    const keys = cache.get.args.map(([key]) => key);
    assert.equal(keys[0], keys[1]);
    assert.notEqual(keys[0], keys[2]);
    assert.notEqual(keys[0], keys[3]);
  });

  it('keeps parsed unknown values independent of serializer mutations', async function () {
    const nested = { value: 'original' };
    const body = { payload: { value: 'body' } };
    const controller = pipeline(
      {
        docName: 'widgets',
        edit: defineMethod({
          options: ['nested', 'include'],
          schema: {
            options: z.object({ nested: z.unknown(), include: z.string() }),
            body: z.object({ payload: z.unknown() }),
          },
          permissions(frame) {
            assert.deepEqual(frame.validated.options.nested, { value: 'original' });
            assert.deepEqual(frame.validated.body.payload, { value: 'body' });
          },
          query(frame) {
            assert.deepEqual(frame.options.withRelated, ['tags']);
            assert.equal(frame.options.include, undefined);
            assert.equal(frame.validated.options.include, 'tags');
            assert.deepEqual(frame.options.nested, { value: 'mutated' });
            assert.deepEqual(frame.data.payload, { value: 'mutated body' });
            assert.throws(() => {
              Object.assign(frame, { validated: {} });
            }, TypeError);
            return frame.validated;
          },
        }),
      },
      {
        ...apiUtils,
        serializers: {
          ...apiUtils.serializers,
          input: {
            widgets: {
              edit(_config: unknown, frame: Frame) {
                Object.assign(frame.options.nested as object, { value: 'mutated' });
                Object.assign(frame.data.payload as object, { value: 'mutated body' });
              },
            },
          },
        },
      },
    );
    assert.deepEqual(await controller.edit(body, { nested, include: 'tags' }), {
      options: { nested: { value: 'original' }, include: 'tags' },
      body: { payload: { value: 'body' } },
    });
    assert.deepEqual(body, { payload: { value: 'body' } });
  });

  it('retains configured working options in cache keys for body-only schemas', async function () {
    const cache = { get: sinon.stub().resolves('cached'), set: sinon.spy() };
    const controller = pipeline(
      {
        edit: defineMethod({
          options: ['id'],
          schema: { body: z.object({ title: z.string() }) },
          permissions: false,
          query() {},
          cache,
        }),
      },
      apiUtils,
    );
    await controller.edit({ title: 'same' }, { id: 'one' });
    await controller.edit({ title: 'same' }, { id: 'two' });
    assert.notEqual(cache.get.firstCall.firstArg, cache.get.secondCall.firstArg);
  });

  it('awaits async body refinement and transformation before permissions and query', async function () {
    const calls: string[] = [];
    const controller = pipeline(
      {
        add: defineMethod({
          schema: {
            body: z.object({
              title: z
                .string()
                .refine(async (title) => {
                  calls.push('refine');
                  return title.length > 0;
                })
                .transform(async (title) => {
                  calls.push('transform');
                  return title.toUpperCase();
                }),
            }),
          },
          permissions(frame) {
            calls.push('permissions');
            assert.equal(frame.validated.body.title, 'TITLE');
          },
          query(frame) {
            calls.push('query');
            return frame.validated.body.title;
          },
        }),
      },
      apiUtils,
    );
    assert.equal(await controller.add({ title: 'title' }, {}), 'TITLE');
    assert.deepEqual(calls, ['refine', 'transform', 'permissions', 'query']);
    await assert.rejects(controller.add({ title: '' }, {}), errors.ValidationError);
  });

  it('preserves unexpected refinement errors rather than reporting them as invalid input', async function () {
    const failure = new Error('Unexpected failure');
    const controller = pipeline(
      {
        read: defineMethod({
          schema: {
            options: z.object({
              id: z.string().refine(() => {
                throw failure;
              }),
            }),
          },
          permissions: false,
          query() {},
        }),
      },
      apiUtils,
    );
    await assert.rejects(controller.read({ id: 'id' }), (error) => error === failure);
  });

  it('reparses a reused frame and clears earlier parsed data after a failure', async function () {
    const controller = pipeline(
      {
        read: defineMethod({
          schema: { options: z.object({ id: z.string() }) },
          permissions: false,
          query(frame) {
            return frame.validated.options.id;
          },
        }),
      },
      apiUtils,
    );
    const frame = new Frame({ options: { id: 'first' } });
    assert.equal(await controller.read(frame), 'first');
    frame.original.options = { id: 'second' };
    assert.equal(await controller.read(frame), 'second');
    frame.original.options = { id: 123 };
    await assert.rejects(controller.read(frame), errors.ValidationError);
    assert.equal('validated' in frame, false);
  });
});
