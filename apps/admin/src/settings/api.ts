/**
 * Public surface of the settings domain, consumed by the admin shell
 * (apps/admin/src/routes.tsx). Everything else in this domain is internal.
 */
export { settingsRouteChildren } from './routes';
export { canAccessSettingsRoute } from './settings-access';
export { ThemeValidationIssueList } from './site/theme/theme-validation-details';
export { preloadSettings } from './load-settings';
export { LimitModalContent } from './components/limit-modal';

// The Design settings as a panel of their own (View site's Customize). Lazy, so
// a screen showing it doesn't pull the settings code into its own bundle.
export const lazyDesignPanel = () => import('./site/design-panel');
export type { DesignPanelProps } from './site/design-panel';

// A small eager route that loads the rest of Settings itself, so navigating to
// Settings commits at once instead of waiting on its code.
export { default as SettingsRoute } from './settings-route';
