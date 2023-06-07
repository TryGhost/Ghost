import React from 'react';

type ThemeSettingSection = 'site-wide' | 'homepage' | 'post';

interface ThemeSettingsProps {
    settingSection: ThemeSettingSection;
}

const ThemeSettings: React.FC<ThemeSettingsProps> = ({settingSection}) => {
    return (
        <>
            {settingSection}
        </>
    );
};

export default ThemeSettings;