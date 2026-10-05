import { createHash } from 'node:crypto';
import errors from '@tryghost/errors';
import { z } from 'zod';
export type AutomationRunSortDirection = 'asc' | 'desc';
export type AutomationRunPosition = { id: string; created_at: string };

const messages = {
  invalidCursor: 'Automation run cursor is invalid.',
  mismatchedCursor: 'Automation run cursor does not match the requested query.',
};

export const entryDateScopeSchema = z.object({
  date_from: z.iso.date().nullable(),
  date_to: z.iso.date().nullable(),
  timezone: z.string().min(1),
});
export const memberSearchScopeSchema = z.object({
  site: z.string().min(1),
  version: z.literal(1),
  matching: z.literal('contains'),
  query: z.string().regex(/^[a-f0-9]{64}$/),
});
export function memberSearchScope(site: string, query: string) {
  return {
    site,
    version: 1 as const,
    matching: 'contains' as const,
    query: createHash('sha256').update(query).digest('hex'),
  };
}
const runScopeSchema = z.strictObject({
  ...entryDateScopeSchema.shape,
  automation_id: z.string().min(1),
  status: z.enum(['in_progress', 'completed', 'exited_early']).nullable(),
  direction: z.enum(['asc', 'desc']),
});
export type RunCursorScope = z.infer<typeof runScopeSchema>;
const runCursorSchema = runScopeSchema.extend({
  created_at: z.iso.datetime().transform((value) => new Date(value).toISOString()),
  id: z.string().min(1),
});
const searchCursorSchema = runCursorSchema.extend({
  ...memberSearchScopeSchema.shape,
  id: z.string().regex(/^[a-f0-9]{24}$/),
});

// A default end date can advance at midnight; keep the original boundary.
// All other query fields must match, including search identity when present.
export function matchesCursorScope(
  actual: z.infer<typeof entryDateScopeSchema>,
  expected: z.infer<typeof entryDateScopeSchema>,
  preserveEndDate = false,
) {
  const matchesEnd =
    actual.date_to === expected.date_to ||
    (preserveEndDate &&
      actual.date_from !== null &&
      actual.date_to !== null &&
      expected.date_to !== null &&
      actual.date_to > actual.date_from &&
      actual.date_to <= expected.date_to);
  const values = new Map(Object.entries(actual));
  return (
    matchesEnd &&
    Object.entries(expected).every(([key, value]) => key === 'date_to' || values.get(key) === value)
  );
}

export function encodeRunCursor(scope: RunCursorScope, position: AutomationRunPosition) {
  const cursor = { ...scope, id: position.id, created_at: position.created_at };
  return Buffer.from(JSON.stringify(cursor)).toString('base64url');
}

export function decodeRunCursor<T extends RunCursorScope>(
  cursor: unknown,
  scope: T,
  { preserveEndDate = false } = {},
): { scope: T; position: AutomationRunPosition } {
  const schema = 'query' in scope ? searchCursorSchema : runCursorSchema;
  let parsed: ReturnType<typeof schema.safeParse> | undefined;
  if (typeof cursor === 'string' && cursor.length <= 2048 && /^[A-Za-z0-9_-]+$/.test(cursor)) {
    try {
      parsed = schema.safeParse(JSON.parse(Buffer.from(cursor, 'base64url').toString()));
    } catch {
      parsed = undefined;
    }
  }
  if (!parsed?.success) {
    throw new errors.ValidationError({ message: messages.invalidCursor });
  }
  if (!matchesCursorScope(parsed.data, scope, preserveEndDate)) {
    throw new errors.ValidationError({ message: messages.mismatchedCursor });
  }
  return {
    scope: { ...scope, date_to: parsed.data.date_to },
    position: { id: parsed.data.id, created_at: parsed.data.created_at },
  };
}
