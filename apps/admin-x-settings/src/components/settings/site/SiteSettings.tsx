import DesignSetting from './DesignSetting';
import Navigation from './Navigation';
import React from 'react';
import SettingSection from '../../../admin-x-ds/settings/SettingSection';
import Theme from './Theme';

const SiteSettings: React.FC = () => {
    return (
        <>
            <SettingSection title="Site">
                <Theme />
                <DesignSetting />
                <Navigation />
            </SettingSection>
        </>
    );
};

export default SiteSettings;
