import React from 'react';

import LockSite from './LockSite';
import PublicationLanguage from './PublicationLanguage';
import SettingSection from '../../../admin-x-ds/settings/SettingSection';
import SocialAccounts from './SocialAccounts';
import TimeZone from './TimeZone';
import TitleAndDescription from './TitleAndDescription';

const GeneralSettings: React.FC = () => {
    return (
        <>
            <SettingSection title="General">
                <TitleAndDescription />
                <TimeZone />
                <PublicationLanguage />
                <SocialAccounts />
                <LockSite />
            </SettingSection>
        </>
    );
};

export default GeneralSettings;