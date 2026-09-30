// Compile-only contract tests, included by test:types but not executed by Vitest.
import { expectTypeOf } from 'vitest';
import { z } from 'zod';
import { defineMethod, Frame, pipeline } from '../../src/index.ts';
import type {
  Controller,
  InferMethodFrame,
  SchemaControllerMethod,
  ValidatedFrame,
} from '../../src/index.ts';

export function optionsAndBody() {
  const options = z.object({
    id: z.string(),
    page: z.string().transform(Number).default(1),
    filter: z.string().optional(),
  });
  const body = z.object({
    widgets: z.array(z.object({ title: z.string(), enabled: z.boolean() })).length(1),
  });

  const method = defineMethod({
    schema: { options, body },
    options: ['id', 'page', 'filter'],
    headers: { cacheInvalidate: true },
    statusCode: 200,
    validation(frame) {
      expectTypeOf(frame.validated.options).toEqualTypeOf<z.output<typeof options>>();
      expectTypeOf(frame.validated.body).toEqualTypeOf<z.output<typeof body>>();
    },
    permissions(frame) {
      expectTypeOf(frame.validated.options.id).toEqualTypeOf<string>();
      expectTypeOf(frame.validated.options.filter).toEqualTypeOf<string | undefined>();
      expectTypeOf(frame.options.context).toEqualTypeOf<Record<string, unknown> | undefined>();
    },
    generateCacheKeyData(frame) {
      expectTypeOf(frame.validated.options.page).toEqualTypeOf<number>();
      return frame.validated.options.id;
    },
    async query(frame) {
      expectTypeOf(frame).toExtend<Frame>();
      expectTypeOf(frame.data).toEqualTypeOf<Record<string, unknown>>();
      expectTypeOf(frame.options.id).toEqualTypeOf<unknown>();
      expectTypeOf(frame.validated.body.widgets).toEqualTypeOf<
        Array<{ title: string; enabled: boolean }>
      >();

      // @ts-expect-error Only declared schema properties are available.
      void frame.validated.options.missing;
      // @ts-expect-error Callback values use the transformed output type.
      const page: string = frame.validated.options.page;
      void page;
      // @ts-expect-error Callbacks cannot replace the validated request.
      frame.validated = { options: { id: 'id', page: 1 }, body: { widgets: [] } };
      return frame.validated.body.widgets;
    },
  });

  expectTypeOf(method.schema.options).toEqualTypeOf<typeof options>();
  expectTypeOf(method.schema.body).toEqualTypeOf<typeof body>();
  expectTypeOf<InferMethodFrame<typeof method>['validated']['options']>().toEqualTypeOf<
    z.output<typeof options>
  >();
  expectTypeOf<z.input<typeof method.schema.options>['page']>().toEqualTypeOf<string | undefined>();

  function helper(frame: InferMethodFrame<typeof method>) {
    return frame.validated.options.id;
  }
  expectTypeOf(helper).returns.toEqualTypeOf<string>();

  // @ts-expect-error The legacy pipeline does not populate validated request channels.
  pipeline({ docName: 'widgets', edit: method }, {});
  // @ts-expect-error Schema callbacks require more than an unvalidated legacy frame.
  helper(new Frame());
}

export function optionsOnly() {
  defineMethod({
    schema: { options: z.object({ id: z.string() }) },
    permissions: {
      docName: 'widgets',
      before(frame) {
        expectTypeOf(frame.validated.options.id).toEqualTypeOf<string>();
      },
    },
    query(frame) {
      // @ts-expect-error Undeclared channels are not claimed to be validated.
      void frame.validated.body;
      return frame.validated.options.id;
    },
  });
}

export function bodyOnly() {
  defineMethod({
    schema: { body: z.object({ title: z.string() }) },
    permissions: false,
    query(frame) {
      expectTypeOf(frame.validated.body.title).toEqualTypeOf<string>();
      // @ts-expect-error Undeclared channels are not claimed to be validated.
      void frame.validated.options;
      return frame.validated.body;
    },
  });
}

export function asynchronousSchemas() {
  const body = z.string().transform(async (value) => value.length);
  defineMethod({
    schema: { body },
    permissions: true,
    query(frame) {
      expectTypeOf(frame.validated.body).toEqualTypeOf<number>();
      return frame.validated.body;
    },
  });
}

export function optionalSchema(
  frame: ValidatedFrame<{
    options?: z.ZodObject<{ id: z.ZodString }>;
    body: z.ZodObject<{ title: z.ZodString }>;
  }>,
) {
  expectTypeOf(frame.validated.options).toEqualTypeOf<{ id: string } | undefined>();
  expectTypeOf(frame.validated.body).toEqualTypeOf<{ title: string }>();
}

export function unionSchema() {
  const body = z.discriminatedUnion('kind', [
    z.object({ kind: z.literal('create'), title: z.string() }),
    z.object({ kind: z.literal('delete'), id: z.string() }),
  ]);
  defineMethod({
    schema: { body },
    permissions: true,
    query(frame) {
      if (frame.validated.body.kind === 'create') {
        expectTypeOf(frame.validated.body.title).toEqualTypeOf<string>();
        // @ts-expect-error Discriminated unions retain their branch-specific fields.
        void frame.validated.body.id;
      } else {
        expectTypeOf(frame.validated.body.id).toEqualTypeOf<string>();
      }
      return frame.validated.body;
    },
  });
}

export function invalidDefinitions() {
  defineMethod({
    // @ts-expect-error A definition must declare at least one schema.
    schema: {},
    permissions: false,
    query() {},
  });
  defineMethod({
    // @ts-expect-error Misspelled request channels must not be silently ignored.
    schema: { options: z.object({}), boddy: z.object({}) },
    permissions: false,
    query() {},
  });
  defineMethod({
    // @ts-expect-error Request channels must contain Zod schemas.
    schema: { options: { id: 'string' } },
    permissions: false,
    query() {},
  });
  // @ts-expect-error Permissions must be an explicit decision.
  defineMethod({ schema: { body: z.object({}) }, query() {} });
  // @ts-expect-error A method must have a query callback.
  defineMethod({ schema: { body: z.object({}) }, permissions: false });

  const method: SchemaControllerMethod<{ options: z.ZodString }> = defineMethod({
    schema: { options: z.string() },
    permissions: false,
    query(frame) {
      return frame.validated.options;
    },
  });
  expectTypeOf(method.schema.options).toEqualTypeOf<z.ZodString>();
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
}
