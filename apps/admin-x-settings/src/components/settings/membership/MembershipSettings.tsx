import Access from './Access';
import Portal from './Portal';
import React from 'react';
import SearchableSection from '../../SearchableSection';
import SpamFilters from '../advanced/SpamFilters';
import Tiers from './Tiers';
import TipsAndDonations from '../growth/TipsAndDonations';
import {checkStripeEnabled, getSettingValues} from '@tryghost/admin-x-framework/api/settings';
import {useGlobalData} from '../../providers/GlobalDataProvider';

export const searchKeywords = {
    access: ['membership', 'default', 'access', 'subscription', 'post', 'membership', 'comments', 'commenting', 'signup', 'sign up', 'spam', 'filters', 'prevention', 'prevent', 'block', 'domains', 'email'],
    tiers: ['membership', 'tiers', 'payment', 'paid', 'stripe'],
    portal: ['membership', 'portal', 'signup', 'sign up', 'signin', 'sign in', 'login', 'account', 'membership', 'support', 'email', 'address', 'support email address', 'support address'],
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
            {hasTipsAndDonations && hasStripeEnabled && <TipsAndDonations keywords={searchKeywords.tips} />}
        </SearchableSection>
    );
};

export default MembershipSettings;
