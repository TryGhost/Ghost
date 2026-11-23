import React from 'react';

import AnnouncementBar from '@/settings/site/announcement-bar';
import ChangeTheme from '@/settings/site/change-theme';
import CodeInjection from '@/settings/advanced/code-injection';
import CustomFields from '@/settings/membership/custom-fields';
import DangerZone from '@/settings/advanced/danger-zone';
import DesignSetting from '@/settings/site/design-setting';
import EmailSettings from '@/settings/email/email-settings';
import Emails from '@/settings/email/emails';
import EmbedSignupForm from '@/settings/growth/embed-signup/embed-signup-form';
import Explore from '@/settings/growth/explore';
import GiftSubscriptions from '@/settings/membership/gift-subscriptions';
import History from '@/settings/advanced/history';
import Integrations from '@/settings/advanced/integrations';
import Labs from '@/settings/advanced/labs';
import MemberEmails from '@/settings/membership/member-emails';
import MigrationTools from '@/settings/advanced/migration-tools';
import Navigation from '@/settings/site/navigation';
import Network from '@/settings/growth/network';
import Offers from '@/settings/growth/offers';
import Portal from '@/settings/membership/portal';
import PublicationLanguage from '@/settings/general/publication-language';
import Recommendations from '@/settings/growth/recommendations';
import SEOMeta from '@/settings/general/seo-meta';
import SocialAccounts from '@/settings/general/social-accounts';
import SpamFilters from '@/settings/advanced/spam-filters';
import Tiers from '@/settings/membership/tiers';
import TimeZone from '@/settings/general/time-zone';
import TipsAndDonations from '@/settings/growth/tips-and-donations';
import TitleAndDescription from '@/settings/general/title-and-description';
import Users from '@/settings/general/users';
import Access from '@/settings/membership/access';
import Analytics from '@/settings/membership/analytics';
import { searchKeywords as advancedSearchKeywords } from '@/settings/advanced/search-keywords';
import { searchKeywords as generalSearchKeywords } from '@/settings/general/search-keywords';
import { searchKeywords as growthSearchKeywords } from '@/settings/growth/search-keywords';
import { searchKeywords as membershipSearchKeywords } from '@/settings/membership/search-keywords';
import { searchKeywords as siteSearchKeywords } from '@/settings/site/search-keywords';
import { useSettingsSectionVisibility } from '@/settings/hooks/use-section-visibility';
import type { SettingsGroupId } from './settings-groups';

/** The cards of one settings group, in the order its navigation lists them. */
const SettingsGroupContent: React.FC<{ group: SettingsGroupId }> = ({ group }) => {
  const visibility = useSettingsSectionVisibility();

  switch (group) {
    case 'general':
      return (
        <>
          <TitleAndDescription keywords={generalSearchKeywords.titleAndDescription} />
          <TimeZone keywords={generalSearchKeywords.timeZone} />
          <PublicationLanguage keywords={generalSearchKeywords.publicationLanguage} />
          <Users keywords={generalSearchKeywords.users} />
          <Analytics keywords={generalSearchKeywords.analytics} />
        </>
      );
    case 'site':
      return (
        <>
          <DesignSetting keywords={siteSearchKeywords.design} />
          <ChangeTheme keywords={siteSearchKeywords.theme} />
          <Navigation keywords={siteSearchKeywords.navigation} />
          <AnnouncementBar keywords={siteSearchKeywords.announcementBar} />
        </>
      );
    case 'membership':
      return (
        <>
          <Access keywords={membershipSearchKeywords.access} />
          <SpamFilters keywords={membershipSearchKeywords.access} />
          <Portal keywords={membershipSearchKeywords.portal} />
          <EmbedSignupForm keywords={growthSearchKeywords.embedSignupForm} />
          {visibility.customFields && (
            <CustomFields keywords={membershipSearchKeywords.customFields} />
          )}
        </>
      );
    case 'payments':
      return (
        <>
          <Tiers keywords={membershipSearchKeywords.tiers} />
          {visibility.offers && <Offers keywords={growthSearchKeywords.offers} />}
          {visibility.tipsAndDonations && (
            <TipsAndDonations keywords={membershipSearchKeywords.tips} />
          )}
          {visibility.giftSubscriptions && (
            <GiftSubscriptions keywords={membershipSearchKeywords.giftSubscriptions} />
          )}
        </>
      );
    case 'email':
      return (
        <>
          {visibility.hasAutomations ? <Emails /> : <EmailSettings />}
          {visibility.welcomeEmails && (
            <MemberEmails keywords={membershipSearchKeywords.memberEmails} />
          )}
        </>
      );
    case 'search-social':
      return (
        <>
          <SEOMeta keywords={generalSearchKeywords.metadata} />
          <SocialAccounts keywords={generalSearchKeywords.socialAccounts} />
          <Network keywords={growthSearchKeywords.network} />
          <Explore keywords={growthSearchKeywords.explore} />
          <Recommendations keywords={growthSearchKeywords.recommendations} />
        </>
      );
    case 'advanced':
      return (
        <>
          <Integrations keywords={advancedSearchKeywords.integrations} />
          <CodeInjection keywords={advancedSearchKeywords.codeInjection} />
          <MigrationTools keywords={advancedSearchKeywords.migrationtools} />
          <Labs keywords={advancedSearchKeywords.labs} />
          <History keywords={advancedSearchKeywords.history} />
          <DangerZone keywords={advancedSearchKeywords.dangerzone} />
        </>
      );
  }
};

export default SettingsGroupContent;
