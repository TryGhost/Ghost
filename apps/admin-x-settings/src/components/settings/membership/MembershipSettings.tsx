import Access from './Access';
import Analytics from './Analytics';
import React from 'react';
import SettingSection from '../../../admin-x-ds/settings/SettingSection';

const MembershipSettings: React.FC = () => {
    return (
        <SettingSection groups={[
            {
                element: <Access />,
                searchKeywords: ['access', 'subscription', 'post']
            },
            {
                element: <Analytics />,
                searchKeywords: ['analytics', 'tracking', 'privacy']
            }
        ]} title='Membership' />
    );
};

export default MembershipSettings;
