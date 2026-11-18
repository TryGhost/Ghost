// Compile-only contract tests, included by test:types but not executed by Vitest.
import { expectTypeOf } from 'vitest';
import { z } from 'zod';
import {
  defineMethod,
  Frame,
  http,
  pipeline,
  type Controller,
  type InferMethodFrame,
  type SchemaControllerMethod,
  type SchemaFrame,
} from '../../src/index.ts';

export function allChannels() {
  const params = z.object({ id: z.string() });
  const query = z.object({
    page: z.string().transform(Number).default(1),
    filter: z.string().optional(),
  });
  const body = z.object({
    widgets: z.array(z.object({ title: z.string(), enabled: z.boolean() })).length(1),
  });

  const method = defineMethod({
    schema: { params, query, body },
    headers: { cacheInvalidate: true },
    statusCode: 200,
    validation(frame) {
      // @ts-expect-error Schema callbacks have no working data.
      void frame.data;
      // @ts-expect-error Schema callbacks have no working options.
      void frame.options;
      // @ts-expect-error Parsed input lives on the frame itself.
      void frame.validated;
      expectTypeOf(frame.params).toEqualTypeOf<Readonly<z.output<typeof params>>>();
      expectTypeOf(frame.query).toEqualTypeOf<Readonly<z.output<typeof query>>>();
      expectTypeOf(frame.body).toEqualTypeOf<z.output<typeof body>>();
    },
    permissions(frame) {
      expectTypeOf(frame.params.id).toEqualTypeOf<string>();
      expectTypeOf(frame.query.filter).toEqualTypeOf<string | undefined>();
      expectTypeOf(frame.context).toEqualTypeOf<Record<string, unknown>>();
    },
    generateCacheKeyData(frame) {
      expectTypeOf(frame.query.page).toEqualTypeOf<number>();
      return frame.params.id;
    },
    async handler(frame) {
      expectTypeOf(frame.body.widgets).toEqualTypeOf<Array<{ title: string; enabled: boolean }>>();
      expectTypeOf(frame.transaction.forUpdate).toEqualTypeOf<boolean | undefined>();
      expectTypeOf(frame.modelOptions).toEqualTypeOf<Readonly<Record<string, unknown>>>();
      frame.setHeader('X-Cache-Invalidate', '/*');
      void frame.original.body;

      // @ts-expect-error Only declared schema properties are available.
      void frame.query.missing;
      // @ts-expect-error Callback values use the transformed output type.
      const page: string = frame.query.page;
      void page;
      // @ts-expect-error Parsed params are readonly.
      frame.params.id = 'other';
      // @ts-expect-error Parsed channels cannot be replaced.
      frame.body = { widgets: [] };
      return frame.body.widgets;
    },
  });

  expectTypeOf(method.schema.params).toEqualTypeOf<typeof params>();
  expectTypeOf(method.schema.body).toEqualTypeOf<typeof body>();
  expectTypeOf<InferMethodFrame<typeof method>['query']>().toEqualTypeOf<
    Readonly<z.output<typeof query>>
  >();

  function helper(frame: InferMethodFrame<typeof method>) {
    return frame.params.id;
  }
  expectTypeOf(helper).returns.toEqualTypeOf<string>();
  // @ts-expect-error Schema callbacks require more than an unparsed legacy frame.
  helper(new Frame());

  const api = pipeline({ docName: 'widgets', edit: method }, {});
  expectTypeOf(api.edit.schema).toEqualTypeOf<typeof method.schema>();
  expectTypeOf(api.edit.handler).parameter(0).toEqualTypeOf<InferMethodFrame<typeof method>>();
  expectTypeOf(http(api.edit)).toBeFunction();

  void api.edit(
    { widgets: [{ title: 'Title', enabled: true }] },
    { id: 'id', page: '2', context: { internal: true }, transacting: {} },
  );
  void api.edit(new Frame());
  // @ts-expect-error Internal calls flag undeclared options.
  void api.edit({ widgets: [{ title: 'Title', enabled: true }] }, { id: 'id', extra: true });
  // @ts-expect-error Internal calls check option types against the schema input.
  void api.edit({ widgets: [{ title: 'Title', enabled: true }] }, { id: 1 });
  // @ts-expect-error Internal calls check the body against the schema input.
  void api.edit({ widgets: [{ title: 1 }] }, { id: 'id' });
}

export function undeclaredChannels() {
  defineMethod({
    schema: { params: z.object({ id: z.string() }) },
    permissions: {
      docName: 'widgets',
      before(frame) {
        expectTypeOf(frame.params.id).toEqualTypeOf<string>();
      },
    },
    handler(frame) {
      // @ts-expect-error Undeclared channels are not on the frame.
      void frame.body;
      // @ts-expect-error Undeclared channels are not on the frame.
      void frame.query;
      return frame.params.id;
    },
  });

  const read = defineMethod({
    schema: { query: z.object({ limit: z.string().optional() }) },
    permissions: true,
    handler: (frame) => frame.query.limit,
  });
  const api = pipeline({ read }, {});
  void api.read({ limit: '5' });
  // @ts-expect-error Methods without a body take only options.
  void api.read({}, { limit: '5' });
}

export function asynchronousSchemas() {
  const body = z.string().transform(async (value) => value.length);
  defineMethod({
    schema: { body, async: true },
    permissions: true,
    handler(frame) {
      expectTypeOf(frame.body).toEqualTypeOf<number>();
      return frame.body;
    },
  });
}

export function optionalChannel(
  frame: SchemaFrame<{
    query?: z.ZodObject<{ id: z.ZodString }>;
    body: z.ZodObject<{ title: z.ZodString }>;
  }>,
) {
  expectTypeOf(frame.query).toEqualTypeOf<Readonly<{ id: string }> | undefined>();
  expectTypeOf(frame.body).toEqualTypeOf<{ title: string }>();
}

export function unionBody() {
  const body = z.discriminatedUnion('kind', [
    z.object({ kind: z.literal('create'), title: z.string() }),
    z.object({ kind: z.literal('delete'), id: z.string() }),
  ]);
  defineMethod({
    schema: { body },
    permissions: true,
    handler(frame) {
      if (frame.body.kind === 'create') {
        expectTypeOf(frame.body.title).toEqualTypeOf<string>();
        // @ts-expect-error Discriminated unions retain their branch-specific fields.
        void frame.body.id;
      } else {
        expectTypeOf(frame.body.id).toEqualTypeOf<string>();
      }
      return frame.body;
    },
  });
}

export function invalidDefinitions() {
  defineMethod({
    // @ts-expect-error A definition must declare at least one schema.
    schema: {},
    permissions: false,
    handler() {},
  });
  defineMethod({
    // @ts-expect-error Misspelled request channels must not be silently ignored.
    schema: { query: z.object({}), boddy: z.object({}) },
    permissions: false,
    handler() {},
  });
  defineMethod({
    // @ts-expect-error The options channel is gone; use params or query.
    schema: { options: z.object({}) },
    permissions: false,
    handler() {},
  });
  defineMethod({
    // @ts-expect-error Params and query must be object schemas.
    schema: { query: z.string() },
    permissions: false,
    handler() {},
  });
  defineMethod({
    // @ts-expect-error A key cannot be declared in both params and query.
    schema: { params: z.object({ id: z.string() }), query: z.object({ id: z.string() }) },
    permissions: false,
    handler() {},
  });
  defineMethod({
    // @ts-expect-error Reserved options cannot be declared.
    schema: { query: z.object({ transacting: z.unknown() }) },
    permissions: false,
    handler() {},
  });
  // @ts-expect-error Permissions must be an explicit decision.
  defineMethod({ schema: { body: z.object({}) }, handler() {} });
  // @ts-expect-error A method must have a handler.
  defineMethod({ schema: { body: z.object({}) }, permissions: false });
  defineMethod({
    schema: { body: z.object({}) },
    permissions: false,
    handler() {},
    // @ts-expect-error Schema methods use handler, not query.
    query() {},
  });
  defineMethod({
    schema: { body: z.object({}) },
    permissions: false,
    handler() {},
    // @ts-expect-error Schema methods have no option allowlist.
    options: ['id'],
  });
  defineMethod({
    schema: { body: z.object({}) },
    permissions: false,
    handler() {},
    // @ts-expect-error Schema methods have no data allowlist.
    data: ['id'],
  });

  const method: SchemaControllerMethod<{ body: z.ZodString }> = defineMethod({
    schema: { body: z.string() },
    permissions: false,
    handler: (frame) => frame.body,
  });
  expectTypeOf(method.schema.body).toEqualTypeOf<z.ZodString>();

  // @ts-expect-error Schema methods must come from defineMethod().
  pipeline({ read: { schema: { body: z.string() }, permissions: false, handler() {} } }, {});
  pipeline(
    {
      // @ts-expect-error Legacy methods keep query, not handler.
      read: { permissions: false, handler() {} },
    },
    {},
  );
}

export function mixedController() {
  const read = defineMethod({
    schema: { params: z.object({ id: z.string() }) },
    permissions: false,
    handler: (frame) => frame.params.id,
  });
  const controller = pipeline(
    {
      docName: 'widgets',
      read,
      browse: {
        permissions: false,
        query(frame: Frame) {
          return frame.options.id;
        },
      },
    },
    {},
  );
  expectTypeOf(controller.read).returns.toEqualTypeOf<Promise<unknown>>();
  expectTypeOf(controller.browse).returns.toEqualTypeOf<Promise<unknown>>();
  // @ts-expect-error Pipeline results only expose declared methods.
  void controller.missing;
}

export function legacyControllers() {
  const controller = {
    docName: 'widgets',
    read: {
      options: ['id'],
      validation: { options: { id: { required: true } } },
      permissions: true,
      query(frame) {
        expectTypeOf(frame).toEqualTypeOf<Frame>();
        return frame.options.id;
      },
    },
  } satisfies Controller;

  expectTypeOf(pipeline(controller, {}).read).returns.toEqualTypeOf<Promise<unknown>>();

  type ReadFrame = Frame<{ data: { id: string }; options: { include?: string } }>;
  const typedController = {
    read: {
      data: ['id'],
      permissions: true,
      query(frame: ReadFrame) {
        expectTypeOf(frame.data.id).toEqualTypeOf<string>();
        expectTypeOf(frame.options.include).toEqualTypeOf<string | undefined>();
        return frame.data.id;
      },
    },
  } satisfies Controller<{ read: ReadFrame }>;
  expectTypeOf(typedController.read.query).parameter(0).toEqualTypeOf<ReadFrame>();
  expectTypeOf<Frame['data']['id']>().toEqualTypeOf<string | undefined>();
  expectTypeOf<Frame['options']['id']>().toEqualTypeOf<string | undefined>();
}

export function serializerWorkingData(frame: Frame) {
  expectTypeOf(frame.data.payload).toEqualTypeOf<unknown>();
  frame.data.payload = { title: 'serialized' };
  frame.data = { payload: { title: 'replacement' } };
}
