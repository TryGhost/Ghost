import React from 'react';

import PublicationLanguage from './PublicationLanguage';
import SettingSection from '../../../admin-x-ds/settings/SettingSection';
import TimeZone from './TimeZone';
import TitleAndDescription from './TitleAndDescription';

const GeneralSettings: React.FC = () => {
    return (
        <>
            <SettingSection title="General">
                <TitleAndDescription />
                <TimeZone />
                <PublicationLanguage />
            </SettingSection>
        </>
    );
};

export default GeneralSettings;