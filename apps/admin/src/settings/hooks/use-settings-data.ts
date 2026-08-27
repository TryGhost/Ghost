import { type Config, useBrowseConfigSuspense } from '@tryghost/admin-x-framework/api/config';
import { type Setting, useBrowseSettingsSuspense } from '@tryghost/admin-x-framework/api/settings';
import { type SiteData, useBrowseSiteSuspense } from '@tryghost/admin-x-framework/api/site';
import { type User } from '@tryghost/admin-x-framework/api/users';
import { useCurrentUserSuspense } from '@tryghost/admin-x-framework/api/current-user';

// Suspense reads for the settings tree (below SettingsDataGate): loading
// suspends into the gate's fallback, errors throw to the route error boundary.

export function useSettings(): Setting[] {
  return useBrowseSettingsSuspense().data.settings;
}

export function useConfig(): Config {
  return useBrowseConfigSuspense().data.config;
}

export function useSite(): SiteData {
  return useBrowseSiteSuspense().data.site;
}

// Named for its settings-only loaded-data contract so it cannot be confused
// with the framework hook, which returns the full tri-state query result.
export function useSettingsCurrentUser(): User {
  return useCurrentUserSuspense().data;
}
