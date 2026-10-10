import { useSyncExternalStore } from 'react';
import { useBrowseConfig } from '@tryghost/admin-x-framework/api/config';
import { useCurrentUser } from '@tryghost/admin-x-framework/api/current-user';
import { isOwnerUser } from '@tryghost/admin-x-framework/api/users';

export interface SubscriptionState {
  subscription?: {
    isActiveTrial: boolean;
    trial_end: string | null;
    status: string;
  };
}

let subscriptionState: SubscriptionState | null = null;
const listeners = new Set<() => void>();

/** Records the latest subscription state reported by the billing app. */
export function setBillingSubscriptionState(state: SubscriptionState | null): void {
  subscriptionState = state;
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(): SubscriptionState | null {
  return subscriptionState;
}

/** The subscription state the billing app last reported; `null` until it has reported. */
export function useSubscriptionStatus(): SubscriptionState | null {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

/**
 * Whether the site is in force upgrade mode (requires billing action), or
 * `undefined` while the initial config request is loading.
 *
 * Config `hostSettings.forceUpgrade` only changes on a server restart, so an
 * `active` subscription reported by the billing app clears it locally.
 */
export function useForceUpgrade(): boolean | undefined {
  const { data: config, isLoading } = useBrowseConfig();
  const subscriptionStatus = useSubscriptionStatus();

  if (isLoading) {
    return undefined;
  }

  if (!config?.config?.hostSettings?.forceUpgrade) {
    return false;
  }

  return subscriptionStatus?.subscription?.status !== 'active';
}

/**
 * Whether the current user may open the billing app, or `undefined` while
 * loading. A force upgrade state admits every signed-in user — the billing app
 * is the only way out of it; otherwise billing must be enabled and the user
 * must be the owner.
 */
export function useCanAccessBilling(): boolean | undefined {
  const { data: config } = useBrowseConfig();
  const { data: currentUser } = useCurrentUser();
  const forceUpgrade = useForceUpgrade();

  if (forceUpgrade === undefined || !currentUser) {
    return undefined;
  }
  if (forceUpgrade) {
    return true;
  }
  return Boolean(config?.config.hostSettings?.billing?.enabled) && isOwnerUser(currentUser);
}
