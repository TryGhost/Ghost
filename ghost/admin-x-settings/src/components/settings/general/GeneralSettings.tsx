import React from 'react';

import SettingSection from '../../design-system/settings/SettingSection';
import TitleAndDescription from './TitleAndDescription';
import TimeZone from './TimeZone';
import PublicationLanguage from './PublicationLanguage';

const GeneralSettings: React.FC = () => {
    return (
    <>
        <SettingSection name="General">
            <TitleAndDescription />
            <TimeZone />
            <PublicationLanguage />
        </SettingSection>
    </>
    );
}

export default GeneralSettings;