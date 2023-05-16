import React from 'react';

import PublicationLanguage from './PublicationLanguage';
import SettingSection from '../../design-system/settings/SettingSection';
import TimeZone from './TimeZone';
import TitleAndDescription from './TitleAndDescription';

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
};

export default GeneralSettings;