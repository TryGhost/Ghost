import React, {useContext} from 'react';

import EmailSettings from './settings/email/EmailSettings';
import GeneralSettings from './settings/general/GeneralSettings';
import MembershipSettings from './settings/membership/MembershipSettings';
import SiteSettings from './settings/site/SiteSettings';
import {SettingsContext} from './providers/SettingsProvider';

const Settings: React.FC = () => {
    const {settings} = useContext(SettingsContext) || {};

    // Show loader while settings is first fetched
    if (!settings) {
        return (
            <div className="flex h-full flex-col items-center justify-center">
                <div className="text-center text-2xl font-bold">Loading...</div>
            </div>
        );
    }

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
