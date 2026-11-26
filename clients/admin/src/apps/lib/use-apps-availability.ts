import { useBrowseConfig } from '@tryghost/admin-x-framework/api/config';
import type { AppsAvailability } from './installation-actions';

/**
 * Whether apps can be installed and opened on this site. They call Ghost with tokens only
 * Ghost's new auth engine issues, so on a site running any other, Ghost refuses to preview,
 * install, approve or open one. An app installed earlier can still be listed and uninstalled.
 *
 * `loading` until the site's config has loaded, which is neither answer. A screen inside
 * `AppsGate` never sees it, as the gate renders nothing until the config loads. The sidebar and
 * search sit outside the gate and see it while a session's URL override turns the `apps` flag on
 * before the config has loaded, so they show nothing that depends on it until then.
 */
export function useAppsAvailability(): AppsAvailability {
  const { data } = useBrowseConfig({ refetchOnMount: false });
  if (!data) {
    return 'loading';
  }
  return data.config.auth?.engine === 'better-auth' ? 'supported' : 'unsupported';
}

/** What Admin says wherever apps can't be used because the site doesn't run the new auth engine. */
export const APPS_NEED_NEW_AUTH_ENGINE = {
  title: 'Apps aren’t available on this site',
  description:
    'Apps need Ghost’s new auth engine, which this site doesn’t use yet. Your site isn’t affected.',
};
