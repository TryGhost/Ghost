import { JSONError } from '@tryghost/admin-x-framework/errors';
import { z } from 'zod';

type Write = 'add' | 'edit' | 'delete';

const FAILED: Record<Write, string> = {
  add: 'Failed to save segment',
  edit: 'Failed to save segment',
  delete: 'Failed to delete segment',
};

// A write a validation rule rejected, such as a name another segment has: it names the field,
// and its `context` is written for a publisher.
const RuleRejection = z.object({
  type: z.literal('ValidationError'),
  context: z.string().min(1),
  property: z.string().min(1),
});

/**
 * What a failed segment write shows. A segment that is gone, a staff user who may not change
 * segments and a rejected name are the publisher's to act on, so they are said plainly.
 * Anything else reads as a failed write.
 */
export function segmentWriteFailure(error: unknown, write: Write): string {
  const status = error instanceof JSONError ? error.response?.status : undefined;

  if (status === 404 && write !== 'add') {
    return 'This segment no longer exists';
  }

  if (status === 403) {
    return 'You do not have permission to change segments';
  }

  if (status === 422 && error instanceof JSONError) {
    const rejection = RuleRejection.safeParse(error.data?.errors?.[0]);
    if (rejection.success) {
      // The server's text still calls a segment a view.
      return rejection.data.context.replaceAll('view', 'segment');
    }
  }

  return FAILED[write];
}
