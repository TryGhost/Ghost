import React from 'react';
import ThemeSetting from './ThemeSetting';
import {CustomThemeSetting} from '@tryghost/admin-x-framework/api/customThemeSettings';
import {Form} from '@tryghost/admin-x-design-system';
import {Theme, useBrowseThemes} from '@tryghost/admin-x-framework/api/themes';
import {isCustomThemeSettingVisible} from '../../../../utils/isCustomThemeSettingsVisible';

interface ThemeSettingsProps {
    sections: Array<{
        id: string;
        title: string;
        settings: CustomThemeSetting[];
    }>;
    updateSetting: (setting: CustomThemeSetting) => void;
}

interface ThemeSettingsMap {
    [key: string]: string[];
}

const themeSettingsMap: ThemeSettingsMap = {
    source: ['title_font', 'body_font'],
    casper: ['title_font', 'body_font'],
    alto: ['title_font', 'body_font'],
    bulletin: ['title_font', 'body_font'],
    dawn: ['title_font', 'body_font'],
    digest: ['title_font', 'body_font'],
    dope: ['title_font', 'body_font'],
    ease: ['title_font', 'body_font'],
    edge: ['title_font', 'body_font'],
    edition: ['title_font', 'body_font'],
    episode: ['typography'],
    headline: ['title_font', 'body_font'],
    journal: ['title_font', 'body_font'],
    london: ['title_font', 'body_font'],
    ruby: ['title_font', 'body_font'],
    solo: ['typography'],
    taste: ['style'],
    wave: ['title_font', 'body_font']
};

const ThemeSettings: React.FC<ThemeSettingsProps> = ({sections, updateSetting}) => {
    const {data: themesData} = useBrowseThemes();
    const activeTheme = themesData?.themes.find((theme: Theme) => theme.active);
    const activeThemeName = activeTheme?.package.name?.toLowerCase() || '';

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

                            // hides typography related theme settings from official themes
                            // should be removed once we remove the settings from the themes in 6.0
                            const hidingSettings = themeSettingsMap[activeThemeName];
                            if (hidingSettings && hidingSettings.includes(setting.key)) {
                                spaceClass += ' hidden';
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
