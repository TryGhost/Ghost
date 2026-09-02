import { getSettingValue, useBrowseSettings } from '@tryghost/admin-x-framework/api/settings';
import {
  isAdminUser,
  isAuthorOrContributor,
  isOwnerUser,
} from '@tryghost/admin-x-framework/api/users';
import { useBrowseConfig } from '@tryghost/admin-x-framework/api/config';
import { useBrowseNewsletters } from '@tryghost/admin-x-framework/api/newsletters';
import { useCurrentUser } from '@tryghost/admin-x-framework/api/current-user';
import { useMembersCount } from '@tryghost/admin-x-framework/api/members';
import { useMemo } from 'react';
import type { DefaultEmailRecipients, PublishSiteInput, PublishUserInput } from './publish-options';

/** Both sources count: self-hosters configure Mailgun in settings, hosts inject it via config. */
function mailgunConfigured(
  settings: ReturnType<typeof useBrowseSettings>['data'],
  config: ReturnType<typeof useBrowseConfig>['data'],
): boolean {
  const values = settings?.settings ?? [];
  const fromSettings = Boolean(
    getSettingValue<string>(values, 'mailgun_api_key') &&
    getSettingValue<string>(values, 'mailgun_domain') &&
    getSettingValue<string>(values, 'mailgun_base_url'),
  );

  return (
    fromSettings ||
    (config?.config as { mailgunIsConfigured?: boolean } | undefined)?.mailgunIsConfigured === true
  );
}

export interface PublishInputs {
  site: PublishSiteInput;
  user: PublishUserInput;
  timezone: string;
  /** False until every input has loaded; the machine reads its inputs once. */
  isReady: boolean;
}

/**
 * Assembles the publish machine's site and user inputs from the API. The
 * machine reads them once at creation, so a caller must not build it until
 * `isReady`.
 */
export function usePublishInputs(): PublishInputs {
  const { data: settingsData } = useBrowseSettings();
  const { data: configData } = useBrowseConfig();
  const { data: newslettersData } = useBrowseNewsletters();
  const { data: currentUser } = useCurrentUser();
  // Site-wide total, the way Ember's publish options read it.
  const { count: memberCount, isLoading: memberCountLoading } = useMembersCount('');

  const settings = settingsData?.settings ?? [];
  const isAdmin = Boolean(currentUser && (isOwnerUser(currentUser) || isAdminUser(currentUser)));

  const site = useMemo<PublishSiteInput>(
    () => ({
      membersEnabled: getSettingValue<string>(settings, 'members_signup_access') !== 'none',
      mailgunConfigured: mailgunConfigured(settingsData, configData),
      editorDefaultEmailRecipients:
        (getSettingValue<string>(settings, 'editor_default_email_recipients') as
          | DefaultEmailRecipients
          | undefined) ?? 'visibility',
      editorDefaultEmailRecipientsFilter:
        getSettingValue<string>(settings, 'editor_default_email_recipients_filter') ?? null,
      memberCount,
      newsletters: newslettersData?.newsletters ?? [],
    }),
    [settings, settingsData, configData, memberCount, newslettersData],
  );

  const user = useMemo<PublishUserInput>(
    () => ({
      isAdmin,
      isAuthorOrContributor: Boolean(currentUser && isAuthorOrContributor(currentUser)),
    }),
    [currentUser, isAdmin],
  );

  return {
    site,
    user,
    timezone: getSettingValue<string>(settings, 'timezone') ?? 'Etc/UTC',
    isReady: Boolean(
      settingsData && configData && newslettersData && currentUser && !memberCountLoading,
    ),
  };
}
