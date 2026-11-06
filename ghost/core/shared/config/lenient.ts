import { z } from 'zod';

type Issue = z.core.$ZodIssue;
type Schema = z.ZodType;
type Path = PropertyKey[];

/** Issues the current lenient parse has caught. Parsing is synchronous, so one sink is enough. */
let sink: Issue[] | null = null;

function isFatal(schema: Schema): boolean {
  return z.globalRegistry.get(schema)?.fatal === true;
}

/**
 * Where a child schema reads its input from its parent's: one key of it, every
 * element of it, the same value, or nothing a walk over the input can follow.
 */
type Step = { key: PropertyKey } | 'each' | 'self' | null;

/** The schemas directly inside another, for walking the tree. */
function children(schema: Schema): [Schema, Step][] {
  const def = schema._zod.def as z.core.$ZodTypeDef & Record<string, unknown>;
  switch (def.type) {
    case 'object':
      return [
        ...Object.entries(def.shape as Record<string, Schema>).map(
          ([key, child]): [Schema, Step] => [child, { key }],
        ),
        ...(def.catchall ? [[def.catchall as Schema, null] as [Schema, Step]] : []),
      ];
    case 'union':
      return (def.options as Schema[]).map((option) => [option, 'self']);
    case 'pipe':
      return [
        [def.in as Schema, 'self'],
        [def.out as Schema, null],
      ];
    case 'array':
      return [[def.element as Schema, 'each']];
    case 'record':
      return [
        [def.keyType as Schema, null],
        [def.valueType as Schema, 'each'],
      ];
    case 'tuple':
      return [
        ...(def.items as Schema[]).map((item, key): [Schema, Step] => [item, { key }]),
        ...(def.rest ? [[def.rest as Schema, null] as [Schema, Step]] : []),
      ];
    default:
      return def.innerType ? [[def.innerType as Schema, 'self']] : [];
  }
}

function containsFatal(schema: Schema): boolean {
  return isFatal(schema) || children(schema).some(([child]) => containsFatal(child));
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

function warnsOnUnknownKeys(schema: Schema): boolean {
  return z.globalRegistry.get(schema)?.unknownKeys === 'warn';
}

function isRecord(value: unknown): value is Record<PropertyKey, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/** Whether a union option is one zod could pick for this input. */
function canMatch(union: Schema, option: Schema, value: unknown): boolean {
  const key = (union._zod.def as { discriminator?: string }).discriminator;
  if (key === undefined) {
    return option.safeParse(value).success;
  }
  const allowed = option._zod.propValues?.[key];
  return isRecord(value) && allowed !== undefined && allowed.has(value[key] as never);
}

/**
 * Every key in `input` that a section marked `.meta({unknownKeys: 'warn'})`
 * does not name, by key path.
 *
 * The section still strips them; zod can't warn, as any issue fails the parse,
 * so this walks the raw input alongside the schema instead. The mark reaches
 * through wrappers, transforms and union options to the object they hold, and
 * is ignored on an object that is already loose or strict.
 */
export function findUnknownKeys(schema: Schema, input: unknown): Path[] {
  const found: Path[] = [];
  walkUnknownKeys(schema, input, [], false, found);
  return found;
}

function walkUnknownKeys(
  schema: Schema,
  value: unknown,
  path: Path,
  marked: boolean,
  found: Path[],
): void {
  const def = schema._zod.def as z.core.$ZodTypeDef & Record<string, unknown>;
  marked ||= warnsOnUnknownKeys(schema);

  if (def.type === 'object') {
    if (!isRecord(value)) {
      return;
    }
    if (marked && !def.catchall) {
      const shape = def.shape as Record<string, Schema>;
      for (const key of Object.keys(value)) {
        if (!Object.hasOwn(shape, key)) {
          found.push([...path, key]);
        }
      }
    }
  }

  if (def.type === 'union') {
    // only the option zod would pick, so one option's keys aren't unknown to another
    const option = children(schema).find(([child]) => canMatch(schema, child, value));
    if (option) {
      walkUnknownKeys(option[0], value, path, marked, found);
    }
    return;
  }

  const container = value !== null && typeof value === 'object';

  for (const [child, step] of children(schema)) {
    if (step === 'self') {
      walkUnknownKeys(child, value, path, marked, found);
    } else if (step === null || !container) {
      continue;
    } else if (step === 'each') {
      for (const [key, item] of Object.entries(value)) {
        walkUnknownKeys(child, item, [...path, key], false, found);
      }
    } else {
      const item = (value as Record<PropertyKey, unknown>)[step.key];
      walkUnknownKeys(child, item, [...path, step.key], false, found);
    }
  }
}
