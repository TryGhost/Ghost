import Access from './Access';
import Analytics from './Analytics';
import Portal from './Portal';
import React from 'react';
import SettingSection from '../../../admin-x-ds/settings/SettingSection';

const searchKeywords = {
    portal: ['portal', 'signup', 'sign up', 'sign in', 'login', 'account'],
    access: ['access', 'subscription', 'post'],
    analytics: ['analytics', 'tracking', 'privacy']
};

const MembershipSettings: React.FC = () => {
    return (
        <SettingSection keywords={Object.values(searchKeywords).flat()} title='Membership'>
            <Portal keywords={searchKeywords.portal} />
            <Access keywords={searchKeywords.access} />
            <Analytics keywords={searchKeywords.analytics} />
        </SettingSection>
    );
};

export default MembershipSettings;
