import { getSettingValue, useBrowseSettings } from '@tryghost/admin-x-framework/api/settings';
import { useFeatureFlag } from '@tryghost/admin-x-framework/hooks';
import { CUSTOM_FIELDS_FLAG } from '@/shared/member-custom-fields/availability';
import type { ActivitySettings } from './activity-filters';

/**
 * What decides which events a site's activity shows. One hook for every screen that
 * lists activity, so a member's page and their full activity page cannot disagree about
 * which events exist.
 */
export function useActivitySettings() {
  const settingsQuery = useBrowseSettings({ defaultErrorHandler: false });
  const settings = settingsQuery.data?.settings ?? [];
  // Changes to custom fields stay in a member's history whatever the plan, as they do for
  // an archived field, so only the flag decides whether they show.
  const customFieldsShown = useFeatureFlag(CUSTOM_FIELDS_FLAG);
  const activitySettings: ActivitySettings = {
    editorDefaultEmailRecipients:
      getSettingValue<string>(settings, 'editor_default_email_recipients') ?? undefined,
    commentsEnabled: getSettingValue<string>(settings, 'comments_enabled') ?? undefined,
    emailTrackClicks: getSettingValue<boolean>(settings, 'email_track_clicks') ?? undefined,
    customFieldsShown,
  };
  return { settingsQuery, settings, activitySettings };
}
