import {
  entryDateScopeSchema,
  matchesEntryDateScope,
  type EntryDateScope,
} from './automation-entry-stats';
import errors from '@tryghost/errors';
import { z } from 'zod';
import type {
  AutomationRunPosition,
  AutomationRunSortDirection,
} from './tinybird-automation-stats';

export type RunCursorScope = EntryDateScope & {
  automation_id: string;
  status: 'in_progress' | 'completed' | 'exited_early' | null;
  direction: AutomationRunSortDirection;
};

// Opaque to clients; carries its scope so it cannot continue a different query.
const runCursorSchema = z.strictObject({
  ...entryDateScopeSchema,
  automation_id: z.string().min(1),
  status: z.enum(['in_progress', 'completed', 'exited_early']).nullable(),
  direction: z.enum(['asc', 'desc']),
  created_at: z.iso.datetime().transform((value) => new Date(value).toISOString()),
  id: z.string().min(1),
});

export function encodeRunCursor(scope: RunCursorScope, position: AutomationRunPosition) {
  const cursor = { ...scope, id: position.id, created_at: position.created_at };
  return Buffer.from(JSON.stringify(cursor)).toString('base64url');
}

export function decodeRunCursor(cursor: unknown, scope: RunCursorScope): AutomationRunPosition {
  let parsed: ReturnType<typeof runCursorSchema.safeParse> | undefined;
  if (typeof cursor === 'string') {
    try {
      parsed = runCursorSchema.safeParse(JSON.parse(Buffer.from(cursor, 'base64url').toString()));
    } catch {
      parsed = undefined;
    }
  }
  if (!parsed?.success) {
    throw new errors.ValidationError({ message: 'Automation run cursor is invalid.' });
  }
  const { automation_id: automationId, status, direction, ...position } = parsed.data;
  if (
    automationId !== scope.automation_id ||
    status !== scope.status ||
    direction !== scope.direction ||
    !matchesEntryDateScope(parsed.data, scope)
  ) {
    throw new errors.ValidationError({
      message: 'Automation run cursor does not match the requested automation, status, or order.',
    });
  }
  return { id: position.id, created_at: position.created_at };
}
