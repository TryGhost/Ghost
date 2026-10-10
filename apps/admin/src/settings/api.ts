/**
 * Public surface of the settings domain, consumed by the admin shell
 * (apps/admin/src/routes.tsx). Everything else in this domain is internal.
 */
export { settingsRouteChildren } from './routes';
export { canAccessSettingsRoute } from './settings-access';
export { ThemeValidationIssueList } from './site/theme/theme-validation-details';
export { preloadSettings } from './load-settings';

// A small eager route that loads the rest of Settings itself, so navigating to
// Settings commits at once instead of waiting on its code.
export { default as SettingsRoute } from './settings-route';
