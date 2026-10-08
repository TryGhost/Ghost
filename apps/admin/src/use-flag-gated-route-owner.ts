import { useBrowseConfig } from '@tryghost/admin-x-framework/api/config';
import { useEmberFeatureFlag } from './ember-bridge';

type RouteOwner = 'react' | 'ember';

// Held for the page lifetime: Ember resolves its flags at boot, so an owner
// that moved mid-session would leave both implementations serving one URL.
const latchedOwners = new Map<string, RouteOwner>();

/**
 * Who serves a flag-gated route: Ember's Labs state is authoritative when
 * Ember is present; a standalone React admin falls back to the config query.
 * `pending` while either is still loading. The first resolved owner holds
 * until the next full page load.
 */
export function useFlagGatedRouteOwner(flag: string): RouteOwner | 'pending' {
  const { data: config, isError, isLoading } = useBrowseConfig();
  const emberFlag = useEmberFeatureFlag(flag);

  const latched = latchedOwners.get(flag);
  if (latched) {
    return latched;
  }

  let owner: RouteOwner | 'pending';
  if (typeof emberFlag === 'boolean') {
    owner = emberFlag ? 'react' : 'ember';
  } else if (emberFlag === null || isLoading) {
    owner = 'pending';
  } else if (isError || !config) {
    owner = 'ember';
  } else {
    owner = config.config.labs?.[flag] === true ? 'react' : 'ember';
  }

  if (owner !== 'pending') {
    latchedOwners.set(flag, owner);
  }
  return owner;
}

/** Forgets every latched owner, as a full page load does. */
export function resetFlagGatedRouteOwners(): void {
  latchedOwners.clear();
}
