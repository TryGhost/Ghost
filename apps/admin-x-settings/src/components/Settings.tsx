import React from 'react';

import AdvancedSettings from './settings/advanced/AdvancedSettings';
import EmailSettings from './settings/email/EmailSettings';
import GeneralSettings from './settings/general/GeneralSettings';
import GrowthSettings from './settings/growth/GrowthSettings';
import MembershipSettings from './settings/membership/MembershipSettings';
import SiteSettings from './settings/site/SiteSettings';

const Settings: React.FC = () => {
    return (
        <>
            <div className='mb-[40vh] max-w-[760px] px-8 pt-8 tablet:px-14 xl:pt-0'>
                <GeneralSettings />
                <SiteSettings />
                <MembershipSettings />
                <GrowthSettings />
                <EmailSettings />
                <AdvancedSettings />
            </div>
        </>
    );
};

export default Settings;
