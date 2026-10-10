import { useEffect, useState } from 'react';
import { Navigate } from '@tryghost/admin-x-framework';
import { setBillingScreenOpen } from './billing-screen';
import { useCanAccessBilling } from './subscription-status';

/**
 * Admits the user to `/pro/*`. The billing app itself stays mounted across
 * routes (see BillingFrame) and shows itself while this route is open.
 *
 * Access is decided on entering /pro: a force upgrade lifting mid-visit leaves
 * the user on the screen until they navigate away, rather than pulling the
 * screen out from under them.
 */
export function BillingRoute() {
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
