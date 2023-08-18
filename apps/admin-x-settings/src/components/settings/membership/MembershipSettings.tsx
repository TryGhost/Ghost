import Access from './Access';
import Analytics from './Analytics';
import Portal from './Portal';
import React from 'react';
import SettingSection from '../../../admin-x-ds/settings/SettingSection';
import Tiers from './Tiers';
import TipsOrDonations from './TipsOrDonations';

const searchKeywords = {
    portal: ['portal', 'signup', 'sign up', 'signin', 'sign in', 'login', 'account', 'membership'],
    access: ['default', 'access', 'subscription', 'post', 'membership'],
    tiers: ['tiers', 'payment', 'paid'],
    tips: ['tip', 'donation', 'one time', 'payment'],
    analytics: ['analytics', 'tracking', 'privacy', 'membership']
};

const MembershipSettings: React.FC = () => {
    return (
        <SettingSection keywords={Object.values(searchKeywords).flat()} title='Membership'>
            <Portal keywords={searchKeywords.portal} />
            <Access keywords={searchKeywords.access} />
            <Tiers keywords={searchKeywords.tiers} />
            <TipsOrDonations keywords={searchKeywords.tips} />
            <Analytics keywords={searchKeywords.analytics} />
        </SettingSection>
    );
};

export default MembershipSettings;
