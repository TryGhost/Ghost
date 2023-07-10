import Access from './Access';
import Analytics from './Analytics';
import Portal from './Portal';
import React from 'react';
import SettingSection from '../../../admin-x-ds/settings/SettingSection';
import Tiers from './Tiers';

const searchKeywords = {
    portal: ['portal', 'signup', 'sign up', 'signin', 'sign in', 'login', 'account', 'membership'],
    tiers: ['tiers', 'payment', 'paid'],
    access: ['access', 'subscription', 'post', 'membership'],
    analytics: ['analytics', 'tracking', 'privacy', 'membership']
};

const MembershipSettings: React.FC = () => {
    return (
        <SettingSection keywords={Object.values(searchKeywords).flat()} title='Membership'>
            <Portal keywords={searchKeywords.portal} />
            <Access keywords={searchKeywords.access} />
            <Tiers keywords={searchKeywords.tiers} />
            <Analytics keywords={searchKeywords.analytics} />
        </SettingSection>
    );
};

export default MembershipSettings;
