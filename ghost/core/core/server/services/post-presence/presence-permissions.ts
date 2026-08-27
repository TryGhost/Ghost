// Owner / Admin / Super Editor / Editor see every event. Author and Contributor
// only see posts they are listed on.
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
