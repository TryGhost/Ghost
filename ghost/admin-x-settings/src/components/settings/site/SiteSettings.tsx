import DesignSetting from './DesignSetting';
import React from 'react';
import SettingSection from '../../../admin-x-ds/settings/SettingSection';

const SiteSettings: React.FC = () => {
    return (
        <>
            <SettingSection title="Site">
                <DesignSetting />
            </SettingSection>
        </>
    );
};

export default SiteSettings;
