import { expectTypeOf } from 'vitest';
import { z } from 'zod';
import {
  defineController,
  defineMethod,
  type Frame,
  type InferMethodFrame,
  pipeline,
} from '../../src/index.ts';

const read = defineMethod({
  schema: { params: z.object({ id: z.string() }) },
  permissions: true,
  handler(frame) {
    return frame.params.id;
  },
});

export function inferredControllers() {
  const controller = defineController({
    docName: 'widgets',
    read,
    browse: {
      options: ['limit'],
      permissions: true,
      query(frame) {
        expectTypeOf(frame).toEqualTypeOf<Frame>();
        return frame.options.limit;
      },
    },
  });

  expectTypeOf(controller.docName).toEqualTypeOf<'widgets'>();
  expectTypeOf(controller.read).toEqualTypeOf<typeof read>();
  expectTypeOf(controller.read.handler).parameter(0).toEqualTypeOf<InferMethodFrame<typeof read>>();

  const api = pipeline(controller, {});
  expectTypeOf(api.read).returns.toEqualTypeOf<Promise<unknown>>();
  expectTypeOf(api.read.schema).toEqualTypeOf<typeof read.schema>();
  // @ts-expect-error docName is not a method.
  void api.docName;
}

export function invalidControllers() {
  // @ts-expect-error A controller must name its resource.
  defineController({ read });

  defineController({
    docName: 'widgets',
    // @ts-expect-error A schema method must match its schema.
    read: { ...read, schema: { body: z.object({ title: z.string() }) } },
  });

  defineController({
    docName: 'widgets',
    // @ts-expect-error A schema method must come from defineMethod().
    read: { schema: read.schema, permissions: true, handler: read.handler },
  });

  defineController({
    docName: 'widgets',
    browse: {
      // @ts-expect-error Legacy methods keep the ControllerMethod contract.
      permissions: 'yes',
      query() {},
    },
  });
}
