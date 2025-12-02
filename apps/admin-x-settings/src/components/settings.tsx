import React from 'react';

import AdvancedSettings from './settings/advanced/advanced-settings';
import EmailSettings from './settings/email/email-settings';
import GeneralSettings from './settings/general/general-settings';
import GrowthSettings from './settings/growth/growth-settings';
import MembershipSettings from './settings/membership/membership-settings';
import SiteSettings from './settings/site/site-settings';

const Settings: React.FC = () => {
    return (
        <>
            <div className='mb-[60vh] px-8 pt-16 tablet:max-w-[760px] tablet:px-14 tablet:pt-0'>
                <GeneralSettings />
                <SiteSettings />
                <MembershipSettings />
                <EmailSettings />
                <GrowthSettings />
                <AdvancedSettings />
            </div>
        </>
    );
};

export default Settings;
