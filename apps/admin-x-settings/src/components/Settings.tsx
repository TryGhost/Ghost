import React from 'react';

import AdvancedSettings from './settings/advanced/AdvancedSettings';
import EmailSettings from './settings/email/EmailSettings';
import GeneralSettings from './settings/general/GeneralSettings';
import MembershipSettings from './settings/membership/MembershipSettings';
import SiteSettings from './settings/site/SiteSettings';

const Settings: React.FC = () => {
    return (
        <div className='mb-[40vh]'>
            <GeneralSettings />
            <SiteSettings />
            <MembershipSettings />
            <EmailSettings />
            <AdvancedSettings />
            <div className='mt-40 text-sm'>
                <a className='text-green' href="/ghost/#/settings">Click here</a> to open the original Admin settings.
            </div>
        </div>
    );
};

export default Settings;
