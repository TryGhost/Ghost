import Access from './access';
import CustomFields from './custom-fields';
import GiftSubscriptions from './gift-subscriptions';
import MemberEmails from './member-emails';
import Portal from './portal';
import React from 'react';
import SearchableSection from '@/settings/components/searchable-section';
import SpamFilters from '@/settings/advanced/spam-filters';
import Tiers from './tiers';
import TipsAndDonations from '@/settings/growth/tips-and-donations';
import { checkStripeEnabled, getSettingValues } from '@tryghost/admin-x-framework/api/settings';
import { searchKeywords } from './search-keywords';
import { useFeatureFlag } from '@tryghost/admin-x-framework/hooks';
import { useGlobalData } from '@/settings/providers/global-data-context';

const MembershipSettings: React.FC = () => {
  const { config, settings } = useGlobalData();
  const [hasTipsAndDonations, paidMembersEnabled] = getSettingValues(settings, [
    'donations_enabled',
    'paid_members_enabled',
  ]) as [boolean, boolean];
  const hasStripeEnabled = checkStripeEnabled(settings || [], config || {});
  const hasAutomations = useFeatureFlag('automations');
  const hasCustomFields = useFeatureFlag('membersCustomFields');
  const visibleSearchKeywords = [
    searchKeywords.access,
    searchKeywords.tiers,
    searchKeywords.portal,
    ...(paidMembersEnabled ? [searchKeywords.giftSubscriptions] : []),
    ...(hasAutomations ? [] : [searchKeywords.memberEmails]),
    ...(hasTipsAndDonations && hasStripeEnabled ? [searchKeywords.tips] : []),
    ...(hasCustomFields ? [searchKeywords.customFields] : []),
  ].flat();

  return (
    <SearchableSection keywords={visibleSearchKeywords} title="Membership">
      <Access keywords={searchKeywords.access} />
      <SpamFilters keywords={searchKeywords.access} />
      <Tiers keywords={searchKeywords.tiers} />
      <Portal keywords={searchKeywords.portal} />
      {paidMembersEnabled && <GiftSubscriptions keywords={searchKeywords.giftSubscriptions} />}
      {!hasAutomations && <MemberEmails keywords={searchKeywords.memberEmails} />}
      {hasTipsAndDonations && hasStripeEnabled && (
        <TipsAndDonations keywords={searchKeywords.tips} />
      )}
      {hasCustomFields && <CustomFields keywords={searchKeywords.customFields} />}
    </SearchableSection>
  );
};

export default MembershipSettings;
