import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useLocation, useNavigate } from '@tryghost/admin-x-framework';
import { useBrowseConfig } from '@tryghost/admin-x-framework/api/config';
import { useCurrentUser } from '@tryghost/admin-x-framework/api/current-user';
import { parseDunningConfig } from '@tryghost/admin-x-framework/api/dunning';
import { isOwnerUser, type UsersResponseType } from '@tryghost/admin-x-framework/api/users';
import { JSONError } from '@tryghost/admin-x-framework/errors';
import { apiUrl } from '@tryghost/admin-x-framework/helpers';
import { useFeatureFlag, useFetchApi } from '@tryghost/admin-x-framework/hooks';
import { EmptyIndicator, LoadingIndicator } from '@tryghost/shade/components';
import { LucideIcon, cn } from '@tryghost/shade/utils';
import type { AlertsStore } from '@/alerts';
import {
  type SubscriptionState,
  applyEmberBillingSubscriptionUpdate,
  reportEmberBillingLoadFailure,
} from '@/ember-bridge';
import { useThemeContext } from '@/providers/theme-context';
import { useFlagGatedRouteOwner } from '@/use-flag-gated-route-owner';
import { BillingAppConnection } from './billing-app-connection';
import { useBillingScreenOpen } from './billing-screen';
import {
  type BillingAppMessage,
  EXCEEDED_ALERT_HTML,
  EXCEEDED_ALERT_KEY,
  PREVIOUS_PAGE_DESTINATION,
  adminDestinationRoute,
  billingAdminPath,
  billingAlerts,
  billingSubRoute,
  initialBillingSubRoute,
  isBillingAppRoute,
  isBillingPath,
  markDunningPaymentSettled,
  parseBillingSubscription,
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
  // The route's store flips only in its unmount cleanup, after this frame has
  // rendered the next location — the path keeps that render from counting as open
  const visible = useBillingScreenOpen() && isBillingPath(location.pathname);
  const automations = useFeatureFlag('automations');
  const { resolvedTheme } = useThemeContext();

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
  const mountedRef = useRef(true);
  const latestReportRef = useRef(0);

  useEffect(
    () => (frameRef.current ? connection.attach(frameRef.current) : undefined),
    [connection],
  );

  useEffect(() => connection.setVisible(visible), [connection, visible]);

  // The billing app asks for its first theme; only later changes are pushed
  const sentThemeRef = useRef(resolvedTheme);
  useEffect(() => {
    if (!loaded || sentThemeRef.current === resolvedTheme) {
      return;
    }
    sentThemeRef.current = resolvedTheme;
    connection.post({ query: 'themeUpdate', response: resolvedTheme });
  }, [connection, loaded, resolvedTheme]);

  // Another owner (or none) after this frame leaves must not inherit its reports
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      setBillingSubscriptionState(null);
    };
  }, []);

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
      },
    });
  };

  const navigateToAdmin = (destination: unknown) => {
    if (destination === PREVIOUS_PAGE_DESTINATION) {
      const dunning = parseDunningConfig(config?.config.hostSettings?.billing?.dunning);
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

  const handleSubscriptionUpdate = async (
    message: BillingAppMessage,
    subscription: NonNullable<SubscriptionState['subscription']>,
  ) => {
    const checkoutRoute = isBillingAppRoute(message.checkoutRoute)
      ? message.checkoutRoute
      : '/plans';

    // As Ember's billing iframe does: listeners and alerts wait for the plan's
    // fresh config, so a changed dunning block lands with the subscription
    void queryClient.refetchQueries({ queryKey: ['SettingsResponseType'] }).catch(() => {});
    latestReportRef.current += 1;
    const report = latestReportRef.current;
    await Promise.all([
      queryClient.refetchQueries({ queryKey: ['ConfigResponseType'] }).catch(() => {}),
      // Ember's limits failing to reload must not hold back React's state
      applyEmberBillingSubscriptionUpdate({
        subscription,
        checkoutRoute,
      }).catch(() => {}),
    ]);

    // A newer report or another owner has taken over while this one waited
    if (!mountedRef.current || report !== latestReportRef.current) {
      return;
    }

    setBillingSubscriptionState({ subscription });
    checkoutRouteRef.current = checkoutRoute;

    const { exceeded } = billingAlerts(message);
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
    if (message.request === 'theme') {
      sentThemeRef.current = resolvedTheme;
      connection.post({ request: 'theme', response: resolvedTheme });
    }
    if (message.request === 'navigateToAdmin') {
      navigateToAdmin(message.destination);
    }
    const subscription = parseBillingSubscription(message.subscription);
    if (subscription) {
      void handleSubscriptionUpdate(message, subscription);
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
    // Hidden, the frame keeps the content area's size: Safari can leave the
    // billing app laid out for an iframe that loaded under display: none
    <div
      className={cn(
        'size-full bg-background',
        visible ? 'relative' : 'pointer-events-none invisible absolute inset-0 -z-10',
      )}
    >
      <iframe
        ref={frameRef}
        allow="clipboard-write"
        className="absolute inset-0 size-full [transform:translate3d(0,0,0)] border-0"
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
