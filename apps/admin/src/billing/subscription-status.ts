import { useSyncExternalStore } from 'react';
import { useBrowseConfig } from '@tryghost/admin-x-framework/api/config';
import { useCurrentUser } from '@tryghost/admin-x-framework/api/current-user';
import { isOwnerUser } from '@tryghost/admin-x-framework/api/users';
import { type SubscriptionState, useEmberSubscriptionStatus } from '@/ember-bridge';
import { useFlagGatedRouteOwner } from '@/use-flag-gated-route-owner';

export const BILLING_REACT_FLAG = 'billingReact';

let reactSubscriptionState: SubscriptionState | null = null;
const listeners = new Set<() => void>();

/** Records the latest subscription state reported by React's billing app. */
export function setBillingSubscriptionState(state: SubscriptionState | null): void {
  reactSubscriptionState = state;
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(): SubscriptionState | null {
  return reactSubscriptionState;
}

/**
 * The subscription state the billing app last reported, from whichever shell
 * runs the billing app. `null` until the billing app has reported.
 */
export function useSubscriptionStatus(): SubscriptionState | null {
  const owner = useFlagGatedRouteOwner(BILLING_REACT_FLAG);
  const emberStatus = useEmberSubscriptionStatus();
  const reactStatus = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  if (owner === 'react') {
    return reactStatus;
  }
  return owner === 'ember' ? emberStatus : null;
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
