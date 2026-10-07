import { useEffect, useState } from 'react';
import { Navigate } from '@tryghost/admin-x-framework';
import { EmberFallback } from '@/ember-bridge';
import { useFlagGatedRouteOwner } from '@/use-flag-gated-route-owner';
import { setBillingScreenOpen } from './billing-screen';
import { BILLING_REACT_FLAG, useCanAccessBilling } from './subscription-status';

/**
 * Serves `/pro/*` from Ember until the `billingReact` Labs flag is known to be
 * on — Ember's pro route aborts once its Labs settings say React owns billing,
 * so showing Ember meanwhile never shows Ember's billing app. When React owns
 * it, the persistent BillingFrame shows itself while this route admits the user.
 */
export function BillingRoute() {
  const owner = useFlagGatedRouteOwner(BILLING_REACT_FLAG);

  if (owner !== 'react') {
    return <EmberFallback />;
  }
  return <BillingScreenRoute />;
}

// Access is decided on entering /pro, as Ember's pro route decides it in
// beforeModel: a force upgrade lifting mid-visit leaves the user on the screen
// until they navigate away, rather than pulling the screen out from under them
function BillingScreenRoute() {
  const canAccessBilling = useCanAccessBilling();
  const [admitted, setAdmitted] = useState<boolean | undefined>(undefined);

  if (admitted === undefined && canAccessBilling !== undefined) {
    setAdmitted(canAccessBilling);
  }

  useEffect(() => {
    if (!admitted) {
      return;
    }
    setBillingScreenOpen(true);
    return () => setBillingScreenOpen(false);
  }, [admitted]);

  if (admitted === false) {
    return <Navigate to="/" replace />;
  }
  return null;
}
