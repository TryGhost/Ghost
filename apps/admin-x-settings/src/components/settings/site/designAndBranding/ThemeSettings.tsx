import React from 'react';
import ThemeSetting from './ThemeSetting';
import semver from 'semver';
import useFeatureFlag from '../../../../hooks/useFeatureFlag';
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
    [key: string]: {
        settings: string[];
        version: string;
    };
}

const themeSettingsMap: ThemeSettingsMap = {
    source: {settings: ['title_font', 'body_font'], version: '1.4.0'},
    casper: {settings: ['title_font', 'body_font'], version: '5.8.0'},
    alto: {settings: ['title_font', 'body_font'], version: '1.1.0'},
    bulletin: {settings: ['title_font', 'body_font'], version: '1.1.0'},
    dawn: {settings: ['title_font', 'body_font'], version: '1.1.0'},
    digest: {settings: ['title_font', 'body_font'], version: '1.1.0'},
    dope: {settings: ['title_font', 'body_font'], version: '1.1.0'},
    ease: {settings: ['title_font', 'body_font'], version: '1.1.0'},
    edge: {settings: ['title_font', 'body_font'], version: '1.1.0'},
    edition: {settings: ['title_font', 'body_font'], version: '1.1.0'},
    episode: {settings: ['typography'], version: '1.1.0'},
    headline: {settings: ['title_font', 'body_font'], version: '1.1.0'},
    journal: {settings: ['title_font', 'body_font'], version: '1.1.0'},
    london: {settings: ['title_font', 'body_font'], version: '1.1.0'},
    ruby: {settings: ['title_font', 'body_font'], version: '1.1.0'},
    solo: {settings: ['typography'], version: '1.1.0'},
    taste: {settings: ['style'], version: '1.1.0'},
    wave: {settings: ['title_font', 'body_font'], version: '1.1.0'}
};

const ThemeSettings: React.FC<ThemeSettingsProps> = ({sections, updateSetting}) => {
    const {data: themesData} = useBrowseThemes();
    const activeTheme = themesData?.themes.find((theme: Theme) => theme.active);
    const activeThemeName = activeTheme?.package.name?.toLowerCase() || '';
    const activeThemeAuthor = activeTheme?.package.author?.name || '';
    const activeThemeVersion = activeTheme?.package.version;
    const hasCustomFonts = useFeatureFlag('customFonts');
    const supportsCustomFonts = (() => {
        const themeConfig = themeSettingsMap[activeThemeName];

        if (!themeConfig || !activeThemeVersion) {
            return false;
        }

        return semver.gte(activeThemeVersion, themeConfig.version);
    })();

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
                            if (hasCustomFonts) {
                                const hidingSettings = themeSettingsMap[activeThemeName].settings;
                                if (hidingSettings && hidingSettings.includes(setting.key) && activeThemeAuthor === 'Ghost Foundation' && supportsCustomFonts) {
                                    spaceClass += ' hidden';
                                }
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
