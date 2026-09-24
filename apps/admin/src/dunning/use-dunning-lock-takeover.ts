import { useCurrentUser } from '@tryghost/admin-x-framework/api/current-user';
import { useLocation } from '@tryghost/admin-x-framework';
import { useDunningState } from './use-dunning-state';
import { isBillingRoute, isDataExportRoute } from './stand-down-routes';
import { useBlockingModal } from './use-blocking-modal';

/**
 * Whether the dunning locked takeover is in effect for the current route:
 * the overlay is showing and the surrounding chrome (sidebar) should read as
 * disabled. Stands down on the billing and export routes so their content
 * stays usable, and once the user has dismissed the takeover — the urgent
 * warning banner carries the message from there. An existing modal keeps its
 * focus and pointer ownership until it closes, then the takeover can appear.
 */
export function useDunningLockTakeover(): boolean {
  const { data: currentUser } = useCurrentUser();
  const state = useDunningState();
  const location = useLocation();

  const shouldTakeOver = Boolean(
    state &&
    state.phase === 'locked' &&
    !state.lockDismissed &&
    currentUser &&
    !isBillingRoute(location.pathname) &&
    !isDataExportRoute(location.pathname),
  );
  const modalOpen = useBlockingModal(shouldTakeOver);

  return shouldTakeOver && !modalOpen;
}
