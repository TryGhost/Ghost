import { useBrowseConfig } from '@tryghost/admin-x-framework/api/config';
import type { AppsAvailability } from './installation-actions';

/**
 * Whether apps can be installed and opened on this site. They call Ghost with tokens only
 * Ghost's new auth engine issues, so on a site running any other, Ghost refuses to preview,
 * install, approve or open one. An app installed earlier can still be listed and uninstalled.
 *
 * `loading` until the site's config has loaded, and `unknown` if it failed to, which are neither
 * answer. A screen inside `AppsGate` sees neither, as the gate renders nothing until the config
 * loads and fails the screen if it doesn't. The sidebar and search sit outside the gate and see
 * them while a session's URL override turns the `apps` flag on without the config: they wait
 * while it loads, and offer no app to open if it failed.
 */
export function useAppsAvailability(): AppsAvailability {
  // Not `isError`: every new observer of the failed config refetches it and reports it pending
  // meanwhile, which would flip the sidebar's Apps section in and out.
  const { data, errorUpdatedAt } = useBrowseConfig({ refetchOnMount: false });
  if (!data) {
    return errorUpdatedAt > 0 ? 'unknown' : 'loading';
  }
  return data.config.auth?.engine === 'better-auth' ? 'supported' : 'unsupported';
}

/** What Admin says wherever apps can't be used because the site doesn't run the new auth engine. */
export const APPS_NEED_NEW_AUTH_ENGINE = {
  title: 'Apps aren’t available on this site',
  description:
    'Apps need Ghost’s new auth engine, which this site doesn’t use yet. Your site isn’t affected.',
};
