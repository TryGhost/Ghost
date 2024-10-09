import React from 'react';
import ThemeSetting from './ThemeSetting';
import {CustomThemeSetting} from '@tryghost/admin-x-framework/api/customThemeSettings';
import {Form} from '@tryghost/admin-x-design-system';
import {isCustomThemeSettingVisible} from '../../../../utils/isCustomThemeSettingsVisible';

interface ThemeSettingsProps {
    sections: Array<{
        id: string;
        title: string;
        settings: CustomThemeSetting[];
    }>;
    updateSetting: (setting: CustomThemeSetting) => void;
}

const ThemeSettings: React.FC<ThemeSettingsProps> = ({sections, updateSetting}) => {
    return (
        <>
            {sections.map((section) => {
                const filteredSettings = section.settings.filter(setting => isCustomThemeSettingVisible(setting, section.settings.reduce((obj, {key, value}) => ({...obj, [key]: value}), {}))
                );

                return (
                    <Form key={section.id} className='first-of-type:mt-6' gap='sm' margins='lg' title={section.title}>
                        {filteredSettings.map(setting => (
                            <ThemeSetting
                                key={setting.key}
                                setSetting={value => updateSetting({...setting, value} as CustomThemeSetting)}
                                setting={setting}
                            />
                        ))}
                    </Form>
                );
            })}
        </>
    );
};

export default ThemeSettings;
