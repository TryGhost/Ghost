import { useMemo } from 'react';
import { useBrowseConfig } from '@tryghost/admin-x-framework/api/config';
import {
  checkStripeEnabled,
  getSettingValue,
  useBrowseSettings,
  useNewslettersEnabled,
  usePaidMembersEnabled,
} from '@tryghost/admin-x-framework/api/settings';
import { useFeatureFlag } from '@tryghost/admin-x-framework/hooks';
import { useCustomFieldsAvailable } from '@/shared/member-custom-fields/use-availability';
import { searchKeywords as emailSearchKeywords } from '@/settings/email/search-keywords';
import { searchKeywords as emailsSearchKeywords } from '@/settings/email/emails-search-keywords';

export interface SettingsSectionVisibility {
  isLoading: boolean;
  hasAutomations: boolean;
  giftSubscriptions: boolean;
  welcomeEmails: boolean;
  tipsAndDonations: boolean;
  customFields: boolean;
  offers: boolean;
  /** Keywords of the email sections this site shows. */
  emailKeywords: string[];
}

/**
 * Which conditional Settings sections this site shows. The sidebar and Cmd-K
 * both read it, so search never offers a section the sidebar hides.
 */
export function useSettingsSectionVisibility(): SettingsSectionVisibility {
  const { data: settingsData, isLoading: isSettingsLoading } = useBrowseSettings();
  const { data: configData, isLoading: isConfigLoading } = useBrowseConfig();
  const paidMembersEnabled = usePaidMembersEnabled();
  const hasNewslettersEnabled = useNewslettersEnabled() === true;
  const hasAutomations = useFeatureFlag('automations');
  const customFields = useCustomFieldsAvailable();

  const settings = settingsData?.settings;
  const config = configData?.config;
  const hasTipsAndDonations = Boolean(getSettingValue<boolean>(settings, 'donations_enabled'));
  const hasStripeEnabled = config ? checkStripeEnabled(settings ?? [], config) : false;
  const hasMailgun = hasNewslettersEnabled && !config?.mailgunIsConfigured;

  const emailKeywords = useMemo(() => {
    const keywords = hasAutomations ? emailsSearchKeywords : emailSearchKeywords;
    return [
      keywords.enableNewsletters,
      ...(hasNewslettersEnabled ? [keywords.defaultRecipients] : []),
      ...(hasAutomations
        ? [emailsSearchKeywords.emails]
        : hasNewslettersEnabled
          ? [emailSearchKeywords.newsletters]
          : []),
      ...(hasMailgun ? [keywords.mailgun] : []),
    ].flat();
  }, [hasAutomations, hasNewslettersEnabled, hasMailgun]);

  const isLoading = isSettingsLoading || isConfigLoading;
  const giftSubscriptions = Boolean(paidMembersEnabled);
  const tipsAndDonations = hasTipsAndDonations && hasStripeEnabled;

  return useMemo(
    () => ({
      isLoading,
      hasAutomations,
      giftSubscriptions,
      welcomeEmails: !hasAutomations,
      tipsAndDonations,
      customFields,
      offers: hasStripeEnabled,
      emailKeywords,
    }),
    [
      isLoading,
      hasAutomations,
      giftSubscriptions,
      tipsAndDonations,
      customFields,
      hasStripeEnabled,
      emailKeywords,
    ],
  );
}
