import React, {useContext} from 'react';

import GeneralSettings from './settings/general/GeneralSettings';
import {SettingsContext} from './SettingsProvider';

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
        </>
    );
};

export default Settings;
