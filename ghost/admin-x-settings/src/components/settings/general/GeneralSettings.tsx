import React from 'react';

import Facebook from './Facebook';
import LockSite from './LockSite';
import Metadata from './Metadata';
import PublicationLanguage from './PublicationLanguage';
import SettingSection from '../../../admin-x-ds/settings/SettingSection';
import SocialAccounts from './SocialAccounts';
import TimeZone from './TimeZone';
import TitleAndDescription from './TitleAndDescription';
import Users from './Users';

const GeneralSettings: React.FC = () => {
    return (
        <>
            <SettingSection title="General">
                <TitleAndDescription />
                <TimeZone />
                <PublicationLanguage />
                <Metadata />
                <Facebook />
                <SocialAccounts />
                <LockSite />
                <Users />
            </SettingSection>
        </>
    );
};

export default GeneralSettings;