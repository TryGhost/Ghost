import React from 'react';

import EmailSettings from './settings/email/EmailSettings';
import GeneralSettings from './settings/general/GeneralSettings';
import MembershipSettings from './settings/membership/MembershipSettings';
import SiteSettings from './settings/site/SiteSettings';

const Settings: React.FC = () => {
    return (
        <>
            <GeneralSettings />
            <SiteSettings />
            <MembershipSettings />
            <EmailSettings />
        </>
    );
};

export default Settings;
