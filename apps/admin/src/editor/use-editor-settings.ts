import { getSettingValue, useBrowseSettings } from '@tryghost/admin-x-framework/api/settings';
import { EDITOR_REQUEST_OPTIONS } from './request-options';

/** Ghost's own default when the site has no readable timezone setting. */
const FALLBACK_TIMEZONE = 'Etc/UTC';

/**
 * The site settings the editor reads, on one option shape. `createQuery` keys
 * on the data type and URL alone, so every editor observer shares one entry.
 */
export function useEditorSettings() {
  return useBrowseSettings({
    defaultErrorHandler: false,
    requestOptions: EDITOR_REQUEST_OPTIONS,
  });
}

/** The site's timezone, as every editor surface that formats a date reads it. */
export function useSiteTimezone(): string {
  const { data } = useEditorSettings();
  const timezone = getSettingValue<string>(data?.settings ?? null, 'timezone');
  return typeof timezone === 'string' ? timezone : FALLBACK_TIMEZONE;
}
