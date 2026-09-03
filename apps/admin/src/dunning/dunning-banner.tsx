import { Button } from '@tryghost/shade/components';
import { LucideIcon, cn } from '@tryghost/shade/utils';
import { useCurrentUser } from '@tryghost/admin-x-framework/api/current-user';
import { isOwnerUser } from '@tryghost/admin-x-framework/api/users';
import { useLocation } from '@tryghost/admin-x-framework';
import { useDunningState, markPaymentAttempt } from './use-dunning-state';
import { PAY_URL, bannerMessage, bannerTitle } from './dunning-copy';
import { isBillingRoute } from './is-billing-route';

/**
 * Top-of-content warning strip for the dunning warning phase — and for the
 * locked phase once the user has dismissed the full-page takeover, so the
 * urgent warning stays in view. Renders nothing otherwise, on the billing
 * route itself, or for hosts that don't inject a dunning state.
 */
export function DunningBanner() {
  const { data: currentUser } = useCurrentUser();
  const state = useDunningState();
  const location = useLocation();

  const visible =
    state && (state.phase === 'warning' || (state.phase === 'locked' && state.lockDismissed));

  if (!visible || !currentUser || isBillingRoute(location.pathname)) {
    return null;
  }

  const isOwner = isOwnerUser(currentUser);

  return (
    <div
      className={cn(
        'flex flex-none items-center justify-between gap-4 border-b px-6 py-2.5',
        state.urgent
          ? 'border-state-danger/40 bg-state-danger/10'
          : 'border-state-warning/40 bg-state-warning/10',
      )}
      data-testid="dunning-banner"
      role="alert"
    >
      <div className="flex items-center gap-2.5 text-sm">
        <LucideIcon.TriangleAlert
          className={cn(
            'size-4 shrink-0',
            state.urgent ? 'text-state-danger' : 'text-state-warning',
          )}
        />
        <span>
          <span className="font-semibold">{bannerTitle(state, isOwner)}</span>{' '}
          {bannerMessage(state, isOwner)}
        </span>
      </div>
      {isOwner && (
        <Button size="sm" asChild>
          <a href={PAY_URL} onClick={markPaymentAttempt}>
            Pay now
          </a>
        </Button>
      )}
    </div>
  );
}
