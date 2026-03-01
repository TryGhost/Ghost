import Access from './access';
import MemberEmails from './member-emails';
import Portal from './portal';
import React from 'react';
import SearchableSection from '../../searchable-section';
import SpamFilters from '../advanced/spam-filters';
import Tiers from './tiers';
import TipsAndDonations from '../growth/tips-and-donations';
import {checkStripeEnabled, getSettingValues} from '@tryghost/admin-x-framework/api/settings';
import {useGlobalData} from '../../providers/global-data-provider';

export const searchKeywords = {
    access: ['membership', 'default', 'access', 'subscription', 'post', 'membership', 'comments', 'commenting', 'signup', 'sign up', 'spam', 'filters', 'prevention', 'prevent', 'block', 'domains', 'email'],
    tiers: ['membership', 'tiers', 'payment', 'paid', 'stripe'],
    portal: ['membership', 'portal', 'signup', 'sign up', 'signin', 'sign in', 'login', 'account', 'membership', 'support', 'email', 'address', 'support email address', 'support address'],
    memberEmails: ['membership', 'signup', 'welcome email', 'email', 'new user', 'new member', 'account'],
    tips: ['growth', 'tips', 'donations', 'one time', 'payment']
};

const MembershipSettings: React.FC = () => {
    const {config, settings} = useGlobalData();
    const [hasTipsAndDonations] = getSettingValues(settings, ['donations_enabled']) as [boolean];
    const hasStripeEnabled = checkStripeEnabled(settings || [], config || {});

    return (
        <SearchableSection keywords={Object.values(searchKeywords).flat()} title='Membership'>
            <Access keywords={searchKeywords.access} />
            <SpamFilters keywords={searchKeywords.access} />
            <Tiers keywords={searchKeywords.tiers} />
            <Portal keywords={searchKeywords.portal} />
            <MemberEmails keywords={searchKeywords.memberEmails} />
            {hasTipsAndDonations && hasStripeEnabled && <TipsAndDonations keywords={searchKeywords.tips} />}
        </SearchableSection>
    );
};

export default MembershipSettings;
