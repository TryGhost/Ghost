import { z } from 'zod';

const historyStateSchema = z
  .looseObject({
    idx: z.number().int().nonnegative().optional(),
  })
  .nullable();

/**
 * Whether the active history entry was created by the router (it carries a
 * router index). During a POP, `history.state` already belongs to the target
 * entry by the time a `useBlocker` callback runs, so this must be read
 * synchronously from inside the blocker rather than cached per location.
 */
export function isOnRouterHistoryEntry(): boolean {
  const historyState = historyStateSchema.safeParse(window.history.state);
  return historyState.success && historyState.data?.idx !== undefined;
}
