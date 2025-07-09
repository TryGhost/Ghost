import React from 'react';

import AdvancedSettings from './settings/advanced/AdvancedSettings';
import EmailSettings from './settings/email/EmailSettings';
import GeneralSettings from './settings/general/GeneralSettings';
import GrowthSettings from './settings/growth/GrowthSettings';
import MembershipSettings from './settings/membership/MembershipSettings';
import SiteSettings from './settings/site/SiteSettings';
import useFeatureFlag from '../hooks/useFeatureFlag';

const Settings: React.FC = () => {
    const ui60 = useFeatureFlag('ui60');

    return (
        <>
            <div className='mb-[60vh] px-8 pt-16 tablet:max-w-[760px] tablet:px-14 tablet:pt-0'>
                {ui60 ?
                    <>
                        <GeneralSettings />
                        <SiteSettings />
                        <MembershipSettings />
                        <EmailSettings />
                        <GrowthSettings />
                        <AdvancedSettings />
                    </>
                    :
                    <>
                        <GeneralSettings />
                        <SiteSettings />
                        <MembershipSettings />
                        <GrowthSettings />
                        <EmailSettings />
                        <AdvancedSettings />
                    </>
                }
            </div>
        </>
    );
};

export default Settings;
