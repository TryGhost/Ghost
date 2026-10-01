import { Navigate } from '@tryghost/admin-x-framework';
import { EmberFallback } from '@/ember-bridge';
import { useFlagGatedRouteOwner } from '@/use-flag-gated-route-owner';
import { BILLING_REACT_FLAG, useCanAccessBilling } from './subscription-status';

/**
 * Serves `/pro/*` from Ember, or — when the `billingReact` Labs flag is on —
 * lets the persistent BillingFrame show itself. Users who may not open
 * billing land on the home screen instead.
 */
export function BillingRoute() {
  const owner = useFlagGatedRouteOwner(BILLING_REACT_FLAG);
  const canAccessBilling = useCanAccessBilling();

  if (owner === 'ember') {
    return <EmberFallback />;
  }
  if (owner === 'pending' || canAccessBilling === undefined) {
    return null;
  }
  if (!canAccessBilling) {
    return <Navigate to="/" replace />;
  }
  return null;
}
