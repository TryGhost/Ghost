/**
 * Public surface of the analytics domain, consumed by the admin shell
 * (apps/admin/src/routes.tsx). Everything else in this domain is internal.
 */
export {default as AnalyticsProvider} from './providers/analytics-provider';
export {analyticsRouteChildren} from './routes';
