import { z } from 'zod';

/**
 * Metadata keys the ratchet walkers look for. Both are attached with `.meta()`,
 * which registers them in zod's global registry rather than changing parsing.
 */
const TODO = 'configRatchetTodo';
const LOOSE = 'configRatchetLoose';

/** Allowlist entry for the schema root, which has no key path of its own. */
export const ROOT = '(root)';

type ZodLike = z.ZodType & { def: Record<string, unknown> };

/**
 * An unratcheted section: accepts anything, infers as `any`, and is optional so
 * an absent section is not an error. Replacing a `todo()` with a real schema is
 * the ratchet - see ./ratchet-allowlist.ts.
 */
export function todo(note?: string) {
  return z
    .any()
    .optional()
    .meta({ [TODO]: note ?? true });
}

/**
 * A ratcheted object section that still accepts unknown keys. Tracked so the
 * second ratchet axis (loose -> strict) can't silently stall: every loose
 * section must be listed in ./ratchet-allowlist.ts.
 */
export function looseSection<T extends z.ZodRawShape>(shape: T, note?: string) {
  return markLoose(z.looseObject(shape), note);
}

/** Tag an already-built loose object so the ratchet walker tracks it. */
export function markLoose<T extends z.ZodType>(schema: T, note?: string): T {
  return schema.meta({ [LOOSE]: note ?? true }) as T;
}

function hasMeta(schema: z.ZodType, key: string): boolean {
  return key in (z.globalRegistry.get(schema) ?? {});
}

function walk(schema: z.ZodType, key: string, path: string[], found: string[]): void {
  if (hasMeta(schema, key)) {
    found.push(path.length ? path.join('.') : ROOT);
  }

  const def = (schema as ZodLike).def;

  if (def.type === 'object') {
    const shape = def.shape as z.ZodRawShape;
    for (const name of Object.keys(shape)) {
      walk(shape[name] as z.ZodType, key, [...path, name], found);
    }
    return;
  }

  if (def.type === 'optional' || def.type === 'nullable' || def.type === 'default') {
    walk(def.innerType as z.ZodType, key, path, found);
  }
}

function collect(schema: z.ZodType, key: string): string[] {
  const found: string[] = [];
  walk(schema, key, [], found);
  return [...new Set(found)].sort();
}

/** Dotted paths of every section still awaiting a real schema. */
export function collectTodos(schema: z.ZodType): string[] {
  return collect(schema, TODO);
}

/** Dotted paths of every ratcheted section that still accepts unknown keys. */
export function collectLooseSections(schema: z.ZodType): string[] {
  return collect(schema, LOOSE);
}
