import { Inline } from '@tryghost/shade/primitives';
import { LucideIcon, cn } from '@tryghost/shade/utils';
import { useCurrentUser } from '@tryghost/admin-x-framework/api/current-user';
import { isOwnerUser } from '@tryghost/admin-x-framework/api/users';
import { useLocation } from '@tryghost/admin-x-framework';
import { useDunningState } from './use-dunning-state';
import { useDunningLockTakeover } from './use-dunning-lock-takeover';
import { PayNowButton } from './pay-now-button';
import { bannerMessage, bannerTitle } from './dunning-copy';
import { isBillingRoute } from './stand-down-routes';

/**
 * Top-of-content warning strip. Carries the dunning message whenever the
 * full-page takeover isn't doing so: through the warning phase, and in the
 * locked phase once the takeover was dismissed or stood down for the current
 * route (e.g. the export tools). Renders nothing on the billing route itself,
 * or for hosts that don't inject a dunning state.
 */
export function DunningBanner() {
  const { data: currentUser } = useCurrentUser();
  const state = useDunningState();
  const takeover = useDunningLockTakeover();
  const location = useLocation();

  if (!state || takeover || !currentUser || isBillingRoute(location.pathname)) {
    return null;
  }

  const isOwner = isOwnerUser(currentUser);

  return (
    <Inline
      className={cn(
        'flex-none border-b px-6 py-2.5',
        state.urgent
          ? 'border-state-danger/40 bg-state-danger/10'
          : 'border-state-warning/40 bg-state-warning/10',
      )}
      data-testid="dunning-banner"
      gap="md"
      justify="between"
      role="alert"
    >
      <Inline align="center" className="text-sm" gap="sm">
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
      </Inline>
      {isOwner && <PayNowButton size="sm" state={state} />}
    </Inline>
  );
}
