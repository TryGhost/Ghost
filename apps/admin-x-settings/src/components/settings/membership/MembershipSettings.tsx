import Access from './Access';
import Analytics from './Analytics';
import Portal from './Portal';
import React from 'react';
import SearchableSection from '../../SearchableSection';
import SpamFilters from '../advanced/SpamFilters';
import Tiers from './Tiers';
import TipsAndDonations from '../growth/TipsAndDonations';
import useFeatureFlag from '../../../hooks/useFeatureFlag';
import {checkStripeEnabled, getSettingValues} from '@tryghost/admin-x-framework/api/settings';
import {useGlobalData} from '../../providers/GlobalDataProvider';

export const searchKeywords5x = {
    portal: ['membership', 'portal', 'signup', 'sign up', 'signin', 'sign in', 'login', 'account', 'membership', 'support', 'email', 'address', 'support email address', 'support address'],
    access: ['membership', 'default', 'access', 'subscription', 'post', 'membership', 'comments', 'commenting'],
    tiers: ['membership', 'tiers', 'payment', 'paid', 'stripe'],
    analytics: ['membership', 'analytics', 'tracking', 'privacy', 'membership']
};

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
    const ui60 = useFeatureFlag('ui60');

    if (!ui60) {
        return (
            <SearchableSection keywords={Object.values(searchKeywords5x).flat()} title='Membership'>
                <Portal keywords={searchKeywords5x.portal} />
                <Access keywords={searchKeywords5x.access} />
                <Tiers keywords={searchKeywords5x.tiers} />
                <Analytics keywords={searchKeywords5x.analytics} />
            </SearchableSection>
        );
    }

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
