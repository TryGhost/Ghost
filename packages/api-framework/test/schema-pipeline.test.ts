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
  it.each(['internal', 'http'])(
    'does not copy an unused working body for %s requests',
    async function (transport) {
      let reads = 0;
      const body = {
        get payload() {
          reads += 1;
          return { large: 'opaque payload' };
        },
      };
      const controller = pipeline(
        {
          add: defineMethod({
            schema: { body: z.unknown() },
            permissions: false,
            handler(frame) {
              assert.equal(reads, 0);
              return frame.body;
            },
          }),
        },
        apiUtils,
      );

      if (transport === 'internal') {
        assert.equal(await controller.add(body, {}), body);
      } else {
        const req = { get: () => 'example.com', url: '/widgets/', body };
        const res = { json: sinon.spy(), send: sinon.spy(), status: sinon.spy(), set: sinon.spy() };
        const next = sinon.spy();
        await http(controller.add)(req, res, next);
        assert.equal(next.called, false);
        assert.equal(res.json.firstCall.firstArg, body);
      }
      assert.equal(reads, 0);
    },
  );

  it('does not copy an invalid body before rejecting the request', async function () {
    let reads = 0;
    const body = {
      value: 123,
      get payload() {
        reads += 1;
        return 'unneeded';
      },
    };
    const controller = pipeline(
      {
        add: defineMethod({
          schema: { body: z.object({ value: z.string() }) },
          permissions: false,
          handler() {},
        }),
      },
      apiUtils,
    );
    await assert.rejects(controller.add(body as never, {}), errors.ValidationError);
    assert.equal(reads, 0);
  });

  it('does not generate or serialize unused schema cache keys', async function () {
    const generateCacheKeyData = sinon.spy();
    const controller = pipeline(
      {
        add: defineMethod({
          schema: { body: z.object({ value: z.string().transform(BigInt) }) },
          generateCacheKeyData,
          permissions: false,
          handler(frame) {
            return frame.body.value;
          },
        }),
      },
      apiUtils,
    );
    assert.equal(await controller.add({ value: '123' }, {}), 123n);
    assert.equal(generateCacheKeyData.called, false);
  });

  it('preserves legacy uncached hooks without serializing their unused result', async function () {
    const generateCacheKeyData = sinon.stub().resolves(123n);
    const controller = pipeline(
      {
        read: {
          validation() {},
          permissions: false,
          generateCacheKeyData,
          query() {
            return 'response';
          },
        },
      },
      apiUtils,
    );
    assert.equal(await controller.read(), 'response');
    assert.equal(generateCacheKeyData.calledOnce, true);
  });

  it.each(['set', 'map', 'bigint'])(
    'requires a JSON-compatible custom key for parsed %s values',
    async function (kind) {
      const cache = { get: sinon.spy(), set: sinon.spy() };
      const controller = pipeline(
        {
          add: defineMethod({
            schema: {
              body: z.object({
                value: z.string().transform((value) => {
                  if (kind === 'set') {
                    return new Set([value]);
                  }
                  if (kind === 'map') {
                    return new Map([['key', value]]);
                  }
                  return BigInt(value);
                }),
              }),
            },
            permissions: false,
            handler() {},
            cache,
          }),
        },
        apiUtils,
      );
      await assert.rejects(controller.add({ value: '123' }, {}), (error: unknown) => {
        assert.ok(error instanceof errors.IncorrectUsageError);
        assert.match(error.message, /generateCacheKeyData/);
        return true;
      });
      assert.equal(cache.get.called, false);
    },
  );

  it.each(['set', 'map'])(
    'distinguishes parsed %s contents using an explicit key',
    async function (kind) {
      const store = new Map<string, unknown>();
      const cache = {
        get: (key: string) => store.get(key),
        set: (key: string, value: unknown) => store.set(key, value),
      };
      let queries = 0;
      const controller = pipeline(
        {
          add: defineMethod({
            schema: {
              body: z.object({
                value: z
                  .string()
                  .transform((value) =>
                    kind === 'set' ? new Set([value]) : new Map([['key', value]]),
                  ),
              }),
            },
            generateCacheKeyData(frame) {
              return [...frame.body.value];
            },
            permissions: false,
            handler(frame) {
              queries += 1;
              return [...frame.body.value];
            },
            cache,
          }),
        },
        apiUtils,
      );
      const first = await controller.add({ value: 'one' }, {});
      const second = await controller.add({ value: 'two' }, {});
      assert.notDeepEqual(first, second);
      assert.deepEqual(await controller.add({ value: 'one' }, {}), first);
      assert.equal(queries, 2);
    },
  );

  it('parses internal options and body with defaults and transforms without legacy validators', async function () {
    const schema = {
      params: z.object({ id: z.string() }),
      query: z.object({ page: z.string().transform(Number).default(1) }),
      body: z.object({ title: z.string(), enabled: z.boolean().default(true) }),
    };
    const method = defineMethod({
      schema,
      permissions: false,
      handler(frame) {
        assert.deepEqual(frame.context, { internal: true });
        assert.equal(Object.isFrozen(frame.params), true);
        assert.equal(Object.isFrozen(frame.query), true);
        assert.equal(Object.isFrozen(frame.body), false);
        return { params: frame.params, query: frame.query, body: frame.body };
      },
    });
    const controller = pipeline({ docName: 'widgets', add: method }, apiUtils);

    assert.deepEqual(
      await controller.add(
        { title: 'New', extra: 'stripped' } as never,
        { id: 'not-a-mongo-id', undeclared: 'dropped', context: { internal: true } } as never,
      ),
      {
        params: { id: 'not-a-mongo-id' },
        query: { page: 1 },
        body: { title: 'New', enabled: true },
      },
    );
    assert.deepEqual(
      await controller.add({ title: 'New' }, { id: 'id', page: '2', context: { internal: true } }),
      { params: { id: 'id' }, query: { page: 2 }, body: { title: 'New', enabled: true } },
    );
  });

  it('compiles sync schemas and parses async schemas only when declared', async function () {
    const params = z.object({ id: z.string() });
    const sync = pipeline(
      {
        read: defineMethod({
          schema: { params },
          permissions: false,
          handler: (frame) => frame.params.id,
        }),
      },
      apiUtils,
    );
    assert.notEqual(sync.read.schema.params, params);
    assert.equal(await sync.read({ id: 'id' }), 'id');

    const asyncParams = z.object({ id: z.string().refine(async () => true) });
    const asyncMethod = pipeline(
      {
        read: defineMethod({
          schema: { params: asyncParams, async: true },
          permissions: false,
          handler: (frame) => frame.params.id,
        }),
      },
      apiUtils,
    );
    assert.equal(asyncMethod.read.schema.params, asyncParams);
    assert.equal(await asyncMethod.read({ id: 'id' }), 'id');
  });

  it('keeps HTTP params, query and body in separate channels', async function () {
    const permissions = sinon.spy();
    const controller = pipeline(
      {
        docName: 'widgets',
        read: defineMethod({
          schema: {
            params: z.object({ id: z.string() }),
            query: z.object({ page: z.coerce.number() }),
          },
          permissions: {
            before(frame) {
              assert.deepEqual(frame.params, { id: 'param' });
              assert.deepEqual(frame.query, { page: 2 });
              assert.equal(frame.context.user, 'staff');
            },
          },
          handler(frame) {
            return { params: frame.params, query: frame.query };
          },
        }),
      },
      { ...apiUtils, permissions: { handle: permissions } },
    );
    const req = {
      get: () => 'example.com',
      url: '/widgets/param/',
      user: { id: 'staff' },
      query: { id: 'query', page: '2', context: { internal: true }, transacting: 'untrusted' },
      params: { id: 'param', page: '9' },
    };
    const res = { json: sinon.spy(), send: sinon.spy(), status: sinon.spy(), set: sinon.spy() };
    const next = sinon.spy();

    await http(controller.read)(req, res, next);
    assert.equal(next.called, false);
    assert.equal(permissions.calledOnce, true);
    const [, frame] = permissions.firstCall.args;
    assert.equal(frame.context.internal, undefined);
    assert.deepEqual(frame.transaction, {});
    assert.deepEqual(res.json.firstCall.firstArg, { params: { id: 'param' }, query: { page: 2 } });
  });

  it('routes options on a caller-supplied frame over its params and query', async function () {
    const controller = pipeline(
      {
        read: defineMethod({
          schema: {
            params: z.object({ id: z.string() }),
            query: z.object({ page: z.coerce.number() }),
          },
          permissions: false,
          handler: (frame) => ({ ...frame.params, ...frame.query }),
        }),
      },
      apiUtils,
    );
    const frame = new Frame({
      query: { page: '1' },
      params: { id: 'param' },
      options: { id: 'internal', page: '3' },
    });
    assert.deepEqual(await controller.read(frame), { id: 'internal', page: 3 });
  });

  it('takes transaction handles only from trusted internal calls', async function () {
    const transacting = { trx: true };
    const cache = { get: sinon.stub().resolves(undefined), set: sinon.spy() };
    const seen: unknown[] = [];
    const controller = pipeline(
      {
        edit: defineMethod({
          schema: { params: z.object({ id: z.string() }) },
          permissions: false,
          handler(frame) {
            seen.push({
              transaction: frame.transaction,
              options: frame.modelOptions,
            });
          },
          cache,
        }),
      },
      apiUtils,
    );
    await controller.edit({ id: 'one', transacting, forUpdate: true, context: { internal: true } });
    await controller.edit({ id: 'one', transacting, forUpdate: true, context: { user: 'staff' } });
    assert.deepEqual(seen, [
      {
        transaction: { transacting, forUpdate: true },
        options: { id: 'one', context: { internal: true }, transacting, forUpdate: true },
      },
      { transaction: {}, options: { id: 'one', context: { user: 'staff' } } },
    ]);
    assert.doesNotMatch(cache.get.firstCall.firstArg, /trx|forUpdate/);
  });

  it('validates the original body rather than data populated from params', async function () {
    const read = defineMethod({
      schema: { body: z.object({ title: z.string() }).default({ title: 'default' }) },
      permissions: false,
      handler(frame) {
        return frame.body;
      },
    });
    const controller = pipeline({ read }, apiUtils);
    assert.deepEqual(await controller.read({ id: 'id' } as never), { title: 'default' });
    await assert.rejects(controller.read({} as never, {}), errors.ValidationError);
  });

  it.each([
    ['params', { id: 123 }, 'params.id'],
    ['query', { page: 'one' }, 'query.page'],
  ] as const)(
    'reports invalid %s with their channel and path before any callback',
    async function (_channel, options, property) {
      const handler = sinon.spy();
      const validation = sinon.spy();
      const cache = { get: sinon.stub().resolves('cached'), set: sinon.spy() };
      const generateCacheKeyData = sinon.spy();
      const permissions = sinon.spy();
      const controller = pipeline(
        {
          read: defineMethod({
            schema: {
              params: z.object({ id: z.string().optional() }),
              query: z.object({ page: z.coerce.number().optional() }),
            },
            validation,
            generateCacheKeyData,
            permissions,
            handler,
            cache,
          }),
        },
        apiUtils,
      );
      await assert.rejects(controller.read(options as never), (error: unknown) => {
        assert.ok(error instanceof errors.ValidationError);
        assert.equal(error.statusCode, 422);
        assert.equal(error.property, property);
        assert.deepEqual(error.errorDetails[0].path, property.split('.'));
        return true;
      });
      for (const callback of [validation, generateCacheKeyData, permissions, handler, cache.get]) {
        assert.equal(callback.called, false);
      }
    },
  );

  it('passes body validation errors to HTTP next with method metadata', async function () {
    const handler = sinon.spy();
    const controller = pipeline(
      {
        docName: 'widgets',
        add: defineMethod({
          schema: { body: z.object({ widgets: z.array(z.object({ title: z.string() })) }) },
          permissions: false,
          handler,
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
    assert.equal(handler.called, false);
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
    const handler = sinon.spy();
    const controller = pipeline(
      {
        read: defineMethod({
          schema: {
            params: z.object({
              id: z.string().transform(async (id) => {
                calls.push('parse');
                return id.toUpperCase();
              }),
            }),
            async: true,
          },
          validation(frame) {
            calls.push('validation');
            assert.equal(frame.params.id, 'ID');
          },
          generateCacheKeyData(frame) {
            calls.push('key');
            return frame.params;
          },
          permissions(frame) {
            calls.push('permissions');
            assert.equal(frame.params.id, 'ID');
          },
          handler,
          cache,
        }),
      },
      {
        ...apiUtils,
        serializers: {
          ...apiUtils.serializers,
          input: {
            all() {
              calls.push('serialize');
            },
          },
        },
      },
    );
    assert.equal(await controller.read({ id: 'id' }), 'cached');
    assert.equal(await controller.read({ id: 'id' }), 'cached');
    const once = ['parse', 'validation', 'key', 'serialize', 'permissions', 'cache'];
    assert.deepEqual(calls, [...once, ...once]);
    assert.equal(handler.called, false);
  });

  it('waits for schema-method authorization before returning a shared cached response', async function () {
    const store = new Map<string, unknown>();
    const cache = {
      get: sinon.spy((key: string) => store.get(key)),
      set: sinon.spy((key: string, value: unknown) => store.set(key, value)),
    };
    let startAuthorization!: () => void;
    const authorizing = new Promise<void>((resolve) => {
      startAuthorization = resolve;
    });
    let finishAuthorization!: (allowed: boolean) => void;
    const authorized = new Promise<boolean>((resolve) => {
      finishAuthorization = resolve;
    });
    const handler = sinon.stub().returns('private response');
    const controller = pipeline(
      {
        read: defineMethod({
          schema: { params: z.object({ id: z.string() }) },
          generateCacheKeyData(frame) {
            return frame.params;
          },
          async permissions(frame) {
            assert.equal(frame.params.id, 'id');
            if (frame.context.role === 'Owner') {
              return;
            }
            startAuthorization();
            if (!(await authorized)) {
              throw new errors.NoPermissionError();
            }
          },
          handler,
          cache,
        }),
      },
      apiUtils,
    );

    assert.equal(
      await controller.read({ id: 'id', context: { role: 'Owner' } }),
      'private response',
    );
    const request = controller.read({ id: 'id', context: { role: 'Contributor' } });
    const rejected = assert.rejects(request, errors.NoPermissionError);
    await authorizing;
    try {
      await new Promise<void>((resolve) => {
        setImmediate(resolve);
      });
      assert.equal(cache.get.callCount, 1, 'authorization must finish before consulting the cache');
    } finally {
      finishAuthorization(false);
    }
    await rejected;
    assert.equal(cache.get.callCount, 1, 'denied requests must not consult the cache');
    assert.equal(
      await controller.read({ id: 'id', context: { role: 'Owner' } }),
      'private response',
    );
    assert.equal(handler.callCount, 1, 'authorized cache hits must reuse the response');
  });

  it('does not consult the cache when custom validation rejects parsed input', async function () {
    const error = new errors.ValidationError({ message: 'Custom validation' });
    const cache = { get: sinon.spy(), set: sinon.spy() };
    const controller = pipeline(
      {
        read: defineMethod({
          schema: { params: z.object({ id: z.string() }) },
          validation() {
            throw error;
          },
          permissions: false,
          handler() {},
          cache,
        }),
      },
      apiUtils,
    );
    await assert.rejects(controller.read({ id: 'id' }), (actual) => actual === error);
    assert.equal(cache.get.called, false);
  });

  it('uses parsed channels and trusted context, without the principal, in the default cache key', async function () {
    const cache = { get: sinon.stub().resolves('cached'), set: sinon.spy() };
    const controller = pipeline(
      {
        add: defineMethod({
          schema: {
            params: z.object({ id: z.string() }),
            query: z.object({ page: z.coerce.number().default(1) }),
            body: z.object({ title: z.string() }),
          },
          permissions: false,
          handler() {},
          cache,
        }),
      },
      apiUtils,
    );
    const user = (id: string, session: string) => ({ user: id, principal: { session } });
    await controller.add({ title: 'first' }, { id: 'a', page: '1', context: user('one', 'x') });
    await controller.add({ title: 'first' }, { id: 'a', context: user('one', 'y') });
    await controller.add({ title: 'second' }, { id: 'a', context: user('one', 'x') });
    await controller.add({ title: 'first' }, { id: 'a', context: user('two', 'x') });
    await controller.add({ title: 'first' }, { id: 'b', context: user('one', 'x') });
    const keys = cache.get.args.map(([key]) => key);
    assert.equal(keys[0], keys[1]);
    assert.equal(new Set(keys).size, 4);
    assert.doesNotMatch(keys[0], /principal/);
  });

  it('derives working options from parsed params and query for serializers', async function () {
    const nested = { value: 'original' };
    const body = { payload: { value: 'body' } };
    const controller = pipeline(
      {
        docName: 'widgets',
        edit: defineMethod({
          schema: {
            params: z.object({ id: z.string() }),
            query: z.object({ nested: z.object({ value: z.string() }), include: z.string() }),
            body: z.object({ payload: z.object({ value: z.string() }) }),
          },
          permissions(frame) {
            assert.deepEqual(frame.query.nested, { value: 'original' });
            assert.deepEqual(frame.body.payload, { value: 'body' });
          },
          handler(frame) {
            assert.deepEqual(frame.modelOptions, {
              id: 'id',
              nested: { value: 'mutated' },
              withRelated: ['tags'],
              context: {},
            });
            assert.equal(frame.query.include, 'tags');
            assert.throws(() => {
              Object.assign(frame, { query: {} });
            }, TypeError);
            return { query: frame.query, body: frame.body };
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
                // The shared serializer has already mapped include.
                assert.deepEqual(frame.options, {
                  id: 'id',
                  nested: { value: 'original' },
                  withRelated: ['tags'],
                  context: {},
                });
                Object.assign(frame.options.nested as object, { value: 'mutated' });
                Object.assign(frame.data.payload as object, { value: 'mutated body' });
              },
            },
          },
        },
      },
    );
    assert.deepEqual(
      await controller.edit(body, { id: 'id', nested, include: 'tags', extra: 'dropped' } as never),
      {
        query: { nested: { value: 'original' }, include: 'tags' },
        body: { payload: { value: 'body' } },
      },
    );
    assert.deepEqual(body, { payload: { value: 'body' } });
  });

  it('retains Zod reference semantics for unknown, any and passthrough values', async function () {
    const unknown = { value: 'unknown' };
    const any = { value: 'any' };
    const body = { payload: { value: 'body' } };
    const controller = pipeline(
      {
        read: defineMethod({
          schema: {
            query: z.object({ unknown: z.unknown(), any: z.any() }),
            body: z.object({ payload: z.unknown() }),
          },
          permissions: false,
          handler(frame) {
            assert.equal(frame.query.unknown, unknown);
            assert.equal(frame.query.any, any);
            assert.equal(frame.body.payload, body.payload);
            return frame.body;
          },
        }),
      },
      apiUtils,
    );

    assert.deepEqual(await controller.read(body, { unknown, any }), body);
  });

  it('awaits async body refinement and transformation before permissions and handler', async function () {
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
            async: true,
          },
          permissions(frame) {
            calls.push('permissions');
            assert.equal(frame.body.title, 'TITLE');
          },
          handler(frame) {
            calls.push('handler');
            return frame.body.title;
          },
        }),
      },
      apiUtils,
    );
    assert.equal(await controller.add({ title: 'title' }, {}), 'TITLE');
    assert.deepEqual(calls, ['refine', 'transform', 'permissions', 'handler']);
    await assert.rejects(controller.add({ title: '' }, {}), errors.ValidationError);
  });

  it('preserves unexpected refinement errors rather than reporting them as invalid input', async function () {
    const failure = new Error('Unexpected failure');
    const controller = pipeline(
      {
        read: defineMethod({
          schema: {
            params: z.object({
              id: z.string().refine(() => {
                throw failure;
              }),
            }),
          },
          permissions: false,
          handler() {},
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
          schema: { params: z.object({ id: z.string() }) },
          permissions: false,
          handler(frame) {
            return frame.params.id;
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
    for (const key of ['params', 'context', 'transaction', 'modelOptions']) {
      assert.equal(key in frame, false, key);
    }
  });

  it('rejects schema methods that were not created with defineMethod', function () {
    assert.throws(
      () =>
        pipeline(
          {
            docName: 'widgets',
            read: { schema: { body: z.string() }, permissions: false, handler() {} },
          } as never,
          apiUtils,
        ),
      (error: unknown) => {
        assert.ok(error instanceof errors.IncorrectUsageError);
        assert.match(error.message, /widgets\.read.*defineMethod/);
        return true;
      },
    );
  });
});
