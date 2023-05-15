import React from 'react';

import SettingSection from '../../design-system/settings/SettingSection';
import TitleAndDescription from './TitleAndDescription';

const GeneralSettings: React.FC = () => {
    return (
    <>
        <SettingSection name="General">
            <TitleAndDescription />
        </SettingSection>
    </>
    );
}

export default GeneralSettings;