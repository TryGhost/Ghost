import DesignSetting from './DesignSetting';
import React from 'react';
import SettingSection from '../../../admin-x-ds/settings/SettingSection';
import Theme from './Theme';

const SiteSettings: React.FC = () => {
    return (
        <>
            <SettingSection title="Site">
                <DesignSetting />
                <Theme />
            </SettingSection>
        </>
    );
};

export default SiteSettings;
