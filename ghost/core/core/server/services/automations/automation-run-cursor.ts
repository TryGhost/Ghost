import errors from '@tryghost/errors';
import { z } from 'zod';
export type AutomationRunSortDirection = 'asc' | 'desc';
export type AutomationRunPosition = { id: string; created_at: string };

const messages = {
  invalidCursor: 'Automation run cursor is invalid.',
  mismatchedCursor:
    'Automation run cursor does not match the requested automation, status, order, or date range.',
};

export type RunCursorScope = {
  automation_id: string;
  date_from: string | null;
  date_to: string | null;
  timezone: string;
  status: 'in_progress' | 'completed' | 'exited_early' | null;
  direction: AutomationRunSortDirection;
};

// Opaque to clients; carries its scope so it cannot continue a different query.
const runCursorSchema = z.strictObject({
  automation_id: z.string().min(1),
  date_from: z.iso.date().nullable(),
  date_to: z.iso.date().nullable(),
  timezone: z.string().min(1),
  status: z.enum(['in_progress', 'completed', 'exited_early']).nullable(),
  direction: z.enum(['asc', 'desc']),
  created_at: z.iso.datetime().transform((value) => new Date(value).toISOString()),
  id: z.string().min(1),
});

export function encodeRunCursor(scope: RunCursorScope, position: AutomationRunPosition) {
  const cursor = { ...scope, id: position.id, created_at: position.created_at };
  return Buffer.from(JSON.stringify(cursor)).toString('base64url');
}

export function decodeRunCursor(
  cursor: unknown,
  scope: RunCursorScope,
  { preserveEndDate = false } = {},
): { scope: RunCursorScope; position: AutomationRunPosition } {
  let parsed: ReturnType<typeof runCursorSchema.safeParse> | undefined;
  if (typeof cursor === 'string') {
    try {
      parsed = runCursorSchema.safeParse(JSON.parse(Buffer.from(cursor, 'base64url').toString()));
    } catch {
      parsed = undefined;
    }
  }
  if (!parsed?.success) {
    throw new errors.ValidationError({ message: messages.invalidCursor });
  }
  const {
    automation_id: automationId,
    status,
    direction,
    date_from: dateFrom,
    date_to: dateTo,
    timezone,
    ...position
  } = parsed.data;
  // A default end date can advance at midnight. Reuse the cursor's boundary,
  // but only within the requested start and today's validated upper boundary.
  const matchesEndDate =
    dateTo === scope.date_to ||
    (preserveEndDate &&
      dateFrom !== null &&
      dateTo !== null &&
      scope.date_to !== null &&
      dateTo > dateFrom &&
      dateTo <= scope.date_to);
  if (
    automationId !== scope.automation_id ||
    dateFrom !== scope.date_from ||
    !matchesEndDate ||
    timezone !== scope.timezone ||
    status !== scope.status ||
    direction !== scope.direction
  ) {
    throw new errors.ValidationError({
      message: messages.mismatchedCursor,
    });
  }
  return { scope: { ...scope, date_to: dateTo }, position };
}
