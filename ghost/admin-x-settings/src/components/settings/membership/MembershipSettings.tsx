import Access from './Access';
import Analytics from './Analytics';
import React from 'react';
import SettingSection from '../../../admin-x-ds/settings/SettingSection';

const MembershipSettings: React.FC = () => {
    return (
        <SettingSection title='Membership'>
            <Access />
            <Analytics />
        </SettingSection>
    );
};

export default MembershipSettings;