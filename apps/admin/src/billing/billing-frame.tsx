import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useLocation, useNavigate } from '@tryghost/admin-x-framework';
import { type ConfigResponseType, useBrowseConfig } from '@tryghost/admin-x-framework/api/config';
import { useCurrentUser } from '@tryghost/admin-x-framework/api/current-user';
import { parseDunningConfig } from '@tryghost/admin-x-framework/api/dunning';
import { isOwnerUser, type UsersResponseType } from '@tryghost/admin-x-framework/api/users';
import { JSONError } from '@tryghost/admin-x-framework/errors';
import { apiUrl } from '@tryghost/admin-x-framework/helpers';
import { useFeatureFlag, useFetchApi } from '@tryghost/admin-x-framework/hooks';
import { EmptyIndicator, LoadingIndicator } from '@tryghost/shade/components';
import { LucideIcon } from '@tryghost/shade/utils';
import type { AlertsStore } from '@/alerts';
import { applyEmberBillingSubscriptionUpdate, reportEmberBillingLoadFailure } from '@/ember-bridge';
import { useFlagGatedRouteOwner } from '@/use-flag-gated-route-owner';
import { BillingAppConnection } from './billing-app-connection';
import { useBillingScreenOpen } from './billing-screen';
import {
  type BillingAppMessage,
  EXCEEDED_ALERT_HTML,
  EXCEEDED_ALERT_KEY,
  OVERDUE_ALERT_HTML,
  OVERDUE_ALERT_KEY,
  PREVIOUS_PAGE_DESTINATION,
  adminDestinationRoute,
  billingAdminPath,
  billingAlerts,
  billingSubRoute,
  initialBillingSubRoute,
  isBillingAppRoute,
  markDunningPaymentSettled,
  takePayNowReturnRoute,
} from './billing-protocol';
import {
  BILLING_REACT_FLAG,
  setBillingSubscriptionState,
  useForceUpgrade,
} from './subscription-status';

interface BillingFrameProps {
  alerts: AlertsStore;
  isEmberOwned: (pathname: string) => boolean;
}

interface IdentitiesResponse {
  identities?: Array<{ token?: string }>;
}

function showAlert(alerts: AlertsStore, key: string, type: string, html: string) {
  alerts.remove((alert) => alert.key === key);
  alerts.show({ type, key, message: { html } });
}

/**
 * The Ghost(Pro) billing app, mounted on every Admin page of a billing-enabled
 * site while React owns billing: hidden, it still reports subscription state
 * (trial banner, force upgrade, billing alerts); on `/pro/*` it is the screen.
 */
export function BillingFrame(props: BillingFrameProps) {
  const owner = useFlagGatedRouteOwner(BILLING_REACT_FLAG);
  const { data: config } = useBrowseConfig();
  const billing = config?.config.hostSettings?.billing;

  if (owner !== 'react' || !billing?.enabled || !billing.url) {
    return null;
  }

  return <BillingAppFrame key={billing.url} billingUrl={billing.url} {...props} />;
}

function BillingAppFrame({
  alerts,
  billingUrl,
  isEmberOwned,
}: BillingFrameProps & { billingUrl: string }) {
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fetchApi = useFetchApi();
  const { data: config } = useBrowseConfig();
  const { data: currentUser } = useCurrentUser();
  const forceUpgrade = useForceUpgrade();
  const visible = useBillingScreenOpen();
  const automations = useFeatureFlag('automations');
  const dunningWarnings = useFeatureFlag('dunningWarnings');

  const locationRef = useRef(location);
  locationRef.current = location;
  const visibleRef = useRef(visible);
  visibleRef.current = visible;
  const forceUpgradeRef = useRef(forceUpgrade);
  forceUpgradeRef.current = forceUpgrade;

  const [connection] = useState(
    () =>
      new BillingAppConnection(billingUrl, {
        // As Ember's pro routes queue the route before its iframe exists: a
        // child route loads without the query, the root keeps `?action=…`
        getLocationSubRoute: () =>
          initialBillingSubRoute(locationRef.current.pathname, locationRef.current.search),
        getReportContext: () => ({
          isForceUpgrade: forceUpgradeRef.current === true,
          routeName: billingSubRoute(locationRef.current.pathname) ? 'pro.pro-sub' : 'pro.index',
        }),
        onLoadFailure: reportEmberBillingLoadFailure,
      }),
  );
  const { loaded, failed } = useSyncExternalStore(connection.subscribe, connection.getSnapshot);
  const frameRef = useRef<HTMLIFrameElement>(null);

  // null until the billing app's token request has resolved who is asking
  const isOwnerRef = useRef<boolean | null>(null);
  const checkoutRouteRef = useRef<string | null>(null);
  // The Admin path just synced from a billing app route report, consumed by
  // the navigation it causes so that report is not echoed back to the app
  const syncedPathRef = useRef<string | null>(null);

  useEffect(
    () => (frameRef.current ? connection.attach(frameRef.current) : undefined),
    [connection],
  );

  useEffect(() => connection.setVisible(visible), [connection, visible]);

  // Another owner (or none) after this frame leaves must not inherit its reports
  useEffect(() => () => setBillingSubscriptionState(null), []);

  // Back/forward, links and search results moving between billing routes. The
  // key catches re-selecting the route showing; the path and search catch hash
  // links and history entries, which all share the key 'default'.
  useEffect(() => {
    const syncedPath = syncedPathRef.current;
    syncedPathRef.current = null;
    if (!visible || syncedPath === `${location.pathname}${location.search}`) {
      return;
    }

    const action = new URLSearchParams(location.search).get('action');
    if (action) {
      if (action === 'checkout') {
        connection.navigateToSubRoute(checkoutRouteRef.current);
      }
      return;
    }

    connection.navigateToSubRoute(billingSubRoute(location.pathname) ?? '/');
  }, [connection, visible, location.key, location.pathname, location.search]);

  const syncRoute = (route: unknown) => {
    if (!visibleRef.current || !isBillingAppRoute(route)) {
      return;
    }

    const path = billingAdminPath(route);
    const { pathname, search } = locationRef.current;
    if (`${pathname}${search}` !== path) {
      syncedPathRef.current = path;
      navigate(path, { replace: true });
    }
  };

  const sendToken = async () => {
    const respondWithoutToken = () => {
      isOwnerRef.current = false;
      connection.post({ request: 'token', response: null });
    };

    if (!currentUser || !isOwnerUser(currentUser)) {
      respondWithoutToken();
      return;
    }

    try {
      const response = await fetchApi<IdentitiesResponse>(apiUrl('/identities/'));
      connection.post({ request: 'token', response: response.identities?.[0]?.token });
      isOwnerRef.current = true;
    } catch (error) {
      if (error instanceof JSONError && error.data?.errors?.[0]?.type === 'NoPermissionError') {
        respondWithoutToken();
        return;
      }
      throw error;
    }
  };

  const sendForceUpgradeInfo = async () => {
    let ownerUser: { name: string; email: string } | null = null;

    if (currentUser && isOwnerUser(currentUser)) {
      ownerUser = { name: currentUser.name, email: currentUser.email };
    } else {
      try {
        const { users } = await fetchApi<UsersResponseType>(
          apiUrl('/users/', { filter: "roles.name:'Owner'", limit: '1', include: 'roles' }),
        );
        const owner = users.find(isOwnerUser);
        ownerUser = owner ? { name: owner.name, email: owner.email } : null;
      } catch {
        // Roles that cannot browse staff get the reply without owner details
      }
    }

    connection.post({
      request: 'forceUpgradeInfo',
      response: {
        forceUpgrade: forceUpgrade === true,
        isOwner: isOwnerRef.current,
        ownerUser,
        dunningReturnEnabled: dunningWarnings === true,
      },
    });
  };

  const navigateToAdmin = (destination: unknown) => {
    if (destination === PREVIOUS_PAGE_DESTINATION) {
      const dunning = dunningWarnings
        ? parseDunningConfig(config?.config.hostSettings?.billing?.dunning)
        : null;
      if (dunning) {
        markDunningPaymentSettled(dunning.paymentFailedAt);
      }

      // Without a recorded "Pay now" route (a direct deep link to the payment
      // page) the overview is the fallback; never history.back(), whose
      // previous entry can lie outside Admin
      const returnRoute = takePayNowReturnRoute() ?? billingAdminPath('/');
      navigate(returnRoute, { crossApp: isEmberOwned(returnRoute) });
      return;
    }

    const route = adminDestinationRoute(destination, { automations });
    if (route) {
      navigate(route);
    }
  };

  const handleSubscriptionUpdate = async (message: BillingAppMessage) => {
    const checkoutRoute = isBillingAppRoute(message.checkoutRoute)
      ? message.checkoutRoute
      : '/plans';

    // As Ember's billing iframe does: listeners and alerts wait for the plan's
    // fresh config, so a changed dunning block decides the overdue alert
    void queryClient.refetchQueries({ queryKey: ['SettingsResponseType'] }).catch(() => {});
    await Promise.all([
      queryClient.refetchQueries({ queryKey: ['ConfigResponseType'] }).catch(() => {}),
      applyEmberBillingSubscriptionUpdate({ subscription: message.subscription, checkoutRoute }),
    ]);

    setBillingSubscriptionState({ subscription: message.subscription });
    checkoutRouteRef.current = checkoutRoute;

    const freshConfig = queryClient.getQueriesData<ConfigResponseType>({
      queryKey: ['ConfigResponseType'],
    })[0]?.[1];
    const dunningWarningsActive =
      dunningWarnings &&
      parseDunningConfig(freshConfig?.config.hostSettings?.billing?.dunning) !== null;
    const { overdue, exceeded } = billingAlerts(message, { dunningWarningsActive });

    // Shown to every user: only the owner can act, but everyone is affected
    if (overdue) {
      showAlert(alerts, OVERDUE_ALERT_KEY, 'error', OVERDUE_ALERT_HTML);
    } else {
      alerts.remove((alert) => alert.key === OVERDUE_ALERT_KEY);
    }
    if (exceeded) {
      showAlert(alerts, EXCEEDED_ALERT_KEY, 'warn', EXCEEDED_ALERT_HTML);
    } else {
      alerts.remove((alert) => alert.key === EXCEEDED_ALERT_KEY);
    }
  };

  const handleMessage = (event: MessageEvent) => {
    if (!connection.isFromBillingApp(event)) {
      return;
    }

    const message = event.data as BillingAppMessage;

    if (message.request === 'billingAppReady') {
      connection.markLoaded();
      syncRoute(message.route);
      return;
    }

    connection.recordPreReadyMessage(message as Record<string, unknown>);
    syncRoute(message.route);

    if (message.request === 'token') {
      void sendToken();
    }
    if (message.request === 'forceUpgradeInfo') {
      void sendForceUpgradeInfo();
    }
    if (message.request === 'navigateToAdmin') {
      navigateToAdmin(message.destination);
    }
    if (message.subscription) {
      void handleSubscriptionUpdate(message);
    }
  };

  // Subscribed once; each message reaches the latest render's handlers
  const handleMessageRef = useRef(handleMessage);
  handleMessageRef.current = handleMessage;
  useEffect(() => {
    const listener = (event: MessageEvent) => handleMessageRef.current(event);
    window.addEventListener('message', listener);
    return () => window.removeEventListener('message', listener);
  }, []);

  return (
    <div className="relative size-full bg-background" hidden={!visible}>
      <iframe
        ref={frameRef}
        allow="clipboard-write"
        className="absolute inset-0 size-full border-0"
        title="Billing"
      />
      {visible && !loaded && !failed && (
        <div className="absolute inset-0 flex items-center justify-center bg-background">
          <LoadingIndicator size="lg" />
        </div>
      )}
      {visible && failed && !loaded && (
        <div
          className="absolute inset-0 flex items-center justify-center bg-background p-8"
          role="alert"
        >
          <EmptyIndicator
            description={
              <>
                Refresh the page and try again. If the issue continues, contact{' '}
                <a className="underline" href="mailto:support@ghost.org">
                  support@ghost.org
                </a>
                .
              </>
            }
            title="We couldn't load your Ghost(Pro) settings"
          >
            <LucideIcon.CloudOff />
          </EmptyIndicator>
        </div>
      )}
    </div>
  );
}
