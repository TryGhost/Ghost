// Roles that see all posts in the publication. Anyone with one of
// these roles receives every presence event over SSE without further
// per-post filtering. Author and Contributor are NOT elevated — for
// them, the SSE handler filters events to only those for posts where
// they're listed as an author.
const ELEVATED_ROLES = ['Owner', 'Administrator', 'Super Editor', 'Editor'] as const;

export type PresenceRoleUser = {
  hasRole?: (role: string) => boolean;
};

export type PresenceSubscriber = {
  elevated: boolean;
  userId: string;
};

export type PresenceFilterableEvent = {
  authorIds?: string[] | null;
};

export function hasElevatedPresenceAccess(user: PresenceRoleUser | null | undefined): boolean {
  if (!user || typeof user.hasRole !== 'function') {
    return false;
  }
  return ELEVATED_ROLES.some((role) => user.hasRole?.(role));
}

/**
 * Whether a subscriber should receive a presence event for a given
 * post. Elevated roles see everything; non-elevated only see events
 * for posts where they're listed as an author.
 */
export function canReceiveEvent(
  subscriber: PresenceSubscriber | null | undefined,
  event: PresenceFilterableEvent | null | undefined,
): boolean {
  if (!subscriber) {
    return false;
  }
  if (subscriber.elevated) {
    return true;
  }
  if (!event || !Array.isArray(event.authorIds)) {
    return false;
  }
  return event.authorIds.includes(subscriber.userId);
}
