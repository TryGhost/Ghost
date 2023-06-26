import Access from './Access';
import Analytics from './Analytics';
import React from 'react';
import SettingSection from '../../../admin-x-ds/settings/SettingSection';

const searchKeywords = {
    access: ['access', 'subscription', 'post'],
    analytics: ['analytics', 'tracking', 'privacy']
};

const MembershipSettings: React.FC = () => {
    return (
        <SettingSection keywords={Object.values(searchKeywords).flat()} title='Membership'>
            <Access keywords={searchKeywords.access} />
            <Analytics keywords={searchKeywords.analytics} />
        </SettingSection>
    );
};

export default MembershipSettings;
