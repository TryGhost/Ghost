import Access from './access';
import GiftSubscriptions from './gift-subscriptions';
import MemberEmails from './member-emails';
import Portal from './portal';
import React from 'react';
import SearchableSection from '../../searchable-section';
import SpamFilters from '../advanced/spam-filters';
import Tiers from './tiers';
import TipsAndDonations from '../growth/tips-and-donations';
import useFeatureFlag from '../../../hooks/use-feature-flag';
import {checkStripeEnabled, getSettingValues} from '@tryghost/admin-x-framework/api/settings';
import {useGlobalData} from '../../providers/global-data-provider';

export const searchKeywords = {
    access: ['membership', 'default', 'access', 'subscription', 'post', 'membership', 'comments', 'commenting', 'signup', 'sign up', 'spam', 'filters', 'prevention', 'prevent', 'block', 'domains', 'email', 'password protection', 'lock site', 'private site', 'private site mode', 'make this site private'],
    tiers: ['membership', 'tiers', 'payment', 'paid', 'stripe'],
    portal: ['membership', 'portal', 'signup', 'sign up', 'signin', 'sign in', 'login', 'account', 'membership', 'support', 'email', 'address', 'support email address', 'support address'],
    giftSubscriptions: ['membership', 'gift', 'gifts', 'gift subscriptions', 'present', 'share', 'shareable link'],
    memberEmails: ['membership', 'signup', 'welcome email', 'welcome emails', 'email', 'new user', 'new member', 'account'],
    tips: ['growth', 'tips', 'donations', 'one time', 'payment']
};

const MembershipSettings: React.FC = () => {
    const {config, settings} = useGlobalData();
    const [hasTipsAndDonations, paidMembersEnabled] = getSettingValues(settings, ['donations_enabled', 'paid_members_enabled']) as [boolean, boolean];
    const hasStripeEnabled = checkStripeEnabled(settings || [], config || {});
    const hasAutomations = useFeatureFlag('automations');
    const visibleSearchKeywords = [
        searchKeywords.access,
        searchKeywords.tiers,
        searchKeywords.portal,
        ...(paidMembersEnabled ? [searchKeywords.giftSubscriptions] : []),
        ...(hasAutomations ? [] : [searchKeywords.memberEmails]),
        searchKeywords.tips
    ].flat();

    return (
        <SearchableSection keywords={visibleSearchKeywords} title='Membership'>
            <Access keywords={searchKeywords.access} />
            <SpamFilters keywords={searchKeywords.access} />
            <Tiers keywords={searchKeywords.tiers} />
            <Portal keywords={searchKeywords.portal} />
            {paidMembersEnabled && <GiftSubscriptions keywords={searchKeywords.giftSubscriptions} />}
            {!hasAutomations && <MemberEmails keywords={searchKeywords.memberEmails} />}
            {hasTipsAndDonations && hasStripeEnabled && <TipsAndDonations keywords={searchKeywords.tips} />}
        </SearchableSection>
    );
};

export default MembershipSettings;
