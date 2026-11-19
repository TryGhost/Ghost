import { z } from 'zod';

type Issue = z.core.$ZodIssue;
type Schema = z.ZodType;
type Path = PropertyKey[];

/** Issues the current lenient parse has caught. Parsing is synchronous, so one sink is enough. */
let sink: Issue[] | null = null;

function isFatal(schema: Schema): boolean {
  return z.globalRegistry.get(schema)?.fatal === true;
}

/** The schemas directly inside another, for walking the tree. */
function children(schema: Schema): Schema[] {
  const def = schema._zod.def as z.core.$ZodTypeDef & Record<string, unknown>;
  switch (def.type) {
    case 'object':
      return [
        ...Object.values(def.shape as Record<string, Schema>),
        ...(def.catchall ? [def.catchall as Schema] : []),
      ];
    case 'union':
      return def.options as Schema[];
    case 'pipe':
      return [def.in as Schema, def.out as Schema];
    case 'array':
      return [def.element as Schema];
    case 'record':
      return [def.keyType as Schema, def.valueType as Schema];
    case 'tuple':
      return [...(def.items as Schema[]), ...(def.rest ? [def.rest as Schema] : [])];
    default:
      return def.innerType ? [def.innerType as Schema] : [];
  }
}

function containsFatal(schema: Schema): boolean {
  return isFatal(schema) || children(schema).some(containsFatal);
}

/** A leaf that falls back to its raw input instead of failing the parse, recording why. */
function catchLeaf(schema: Schema, path: Path): Schema {
  return schema.catch((ctx: z.core.$ZodCatchCtx) => {
    for (const issue of ctx.error.issues) {
      sink?.push({ ...issue, path: [...path, ...issue.path] });
    }
    return ctx.value as never;
  });
}

/**
 * A copy of `schema` that never fails on a bad leaf.
 *
 * Each leaf is wrapped in `.catch()`, so a bad value falls back to its raw input
 * and the rest of the parse - transforms and defaults included - still runs.
 * The wrapper knows its own key path, which `ctx.error` does not. Containers
 * are rebuilt around their wrapped children, so one bad leaf costs only that
 * leaf, and are caught too, so a failure of the container itself - a missing
 * section, an unknown key in a strict object - costs only that section.
 *
 * Left unwrapped, so they still fail the whole parse:
 * - anything marked `.meta({fatal: true})`, and everything holding one, so the
 *   failure reaches the top
 * - a discriminated union's discriminator, so an unknown value can't match
 *   every option. The union as a whole falls back instead.
 *
 * A union's options and an object a transform reads aren't caught themselves:
 * zod needs an option to be a plain object, and a transform must never be
 * handed a raw fallback for its whole input. The union or transform is caught
 * instead.
 */
export function lenient<T extends Schema>(schema: T, path: Path = []): T {
  return wrap(schema, path) as T;
}

interface WrapOptions {
  /** This object is a discriminated union's option, keyed on this property. */
  discriminator?: string;
  /** Leave this container's own failures to whatever holds it. */
  bare?: boolean;
}

function wrap(schema: Schema, path: Path, { discriminator, bare }: WrapOptions = {}): Schema {
  if (isFatal(schema)) {
    return schema;
  }

  // a catch here would swallow a fatal failure from anywhere inside
  const guard = (rebuilt: Schema) =>
    bare || containsFatal(schema) ? rebuilt : catchLeaf(rebuilt, path);

  const def = schema._zod.def as z.core.$ZodTypeDef & Record<string, unknown>;

  switch (def.type) {
    case 'object': {
      const shape = def.shape as Record<string, Schema>;
      const wrapped = Object.fromEntries(
        Object.entries(shape).map(([key, child]) => [
          key,
          key === discriminator ? child : wrap(child, [...path, key]),
        ]),
      );
      return guard(schema.clone({ ...def, shape: wrapped } as typeof def));
    }

    case 'optional':
    case 'nullable':
    case 'default':
    case 'prefault':
    case 'readonly':
      return schema.clone({
        ...def,
        innerType: wrap(def.innerType as Schema, path, { bare }),
      } as typeof def);

    case 'pipe': {
      // an object-level transform: a bad leaf inside it falls back on its own, so
      // the transform still runs; a bad object as a whole fails the pipe
      const input = def.in as Schema;
      if (input._zod.def.type === 'object') {
        return guard(schema.clone({ ...def, in: wrap(input, path, { bare: true }) } as typeof def));
      }
      return guard(schema);
    }

    case 'union': {
      const key = def.discriminator as string | undefined;
      if (!key) {
        return guard(schema);
      }
      const options = (def.options as Schema[]).map((option) =>
        wrap(option, path, { discriminator: key, bare: true }),
      );
      return guard(schema.clone({ ...def, options } as typeof def));
    }

    default:
      return guard(schema);
  }
}

/**
 * Parse with `lenient(schema)`, returning the data and every issue it caught.
 * A fatal key still throws, as a ZodError.
 */
export function parseLeniently<T extends Schema>(
  schema: T,
  input: unknown,
): { data: z.output<T>; issues: Issue[] } {
  const issues: Issue[] = [];
  sink = issues;
  try {
    return { data: schema.parse(input), issues };
  } finally {
    sink = null;
  }
}
