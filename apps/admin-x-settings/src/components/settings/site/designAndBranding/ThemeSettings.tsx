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

                let previousType: string | undefined;

                return (
                    <Form key={section.id} className='first-of-type:mt-6' gap='xs' margins='lg' title={section.title}>
                        {filteredSettings.map((setting) => {
                            let spaceClass = '';
                            if (setting.type === 'boolean' && previousType !== 'boolean' && previousType !== undefined) {
                                spaceClass = 'mt-3';
                            }
                            if ((setting.type === 'text' || setting.type === 'select') && (previousType === 'text' || previousType === 'select')) { 
                                spaceClass = 'mt-2';
                            }
                            previousType = setting.type;
                            return <div key={setting.key} className={spaceClass}>
                                <ThemeSetting
                                    key={setting.key}
                                    setSetting={value => updateSetting({...setting, value} as CustomThemeSetting)}
                                    setting={setting}
                                />
                            </div>;
                        })}
                    </Form>
                );
            })}
        </>
    );
};

export default ThemeSettings;
