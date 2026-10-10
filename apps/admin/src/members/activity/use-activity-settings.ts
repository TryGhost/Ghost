import { getSettingValue, useBrowseSettings } from '@tryghost/admin-x-framework/api/settings';
import { useCustomFieldsAvailable } from '@/shared/member-custom-fields/use-availability';
import type { ActivitySettings } from './activity-filters';

/**
 * What decides which events a site's activity shows. One hook for every screen that
 * lists activity, so a member's page and their full activity page cannot disagree about
 * which events exist.
 */
export function useActivitySettings() {
  const settingsQuery = useBrowseSettings({ defaultErrorHandler: false });
  const settings = settingsQuery.data?.settings ?? [];
  const customFieldsAvailable = useCustomFieldsAvailable();
  const activitySettings: ActivitySettings = {
    editorDefaultEmailRecipients:
      getSettingValue<string>(settings, 'editor_default_email_recipients') ?? undefined,
    commentsEnabled: getSettingValue<string>(settings, 'comments_enabled') ?? undefined,
    emailTrackClicks: getSettingValue<boolean>(settings, 'email_track_clicks') ?? undefined,
    customFieldsAvailable,
  };
  return { settingsQuery, settings, activitySettings };
}
