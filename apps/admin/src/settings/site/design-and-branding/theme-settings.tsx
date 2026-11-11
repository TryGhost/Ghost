import React from 'react';
import ThemeSetting from './theme-setting';
import FormSection from '@/settings/components/form-section';
import useCustomFonts from '@/settings/hooks/use-custom-fonts';
import { type CustomThemeSetting } from '@tryghost/admin-x-framework/api/custom-theme-settings';
import { type Theme, useBrowseThemes } from '@tryghost/admin-x-framework/api/themes';
import { isCustomThemeSettingVisible } from '@/settings/utils/is-custom-theme-settings-visible';

interface ThemeSettingsProps {
  sections: Array<{
    id: string;
    title: string;
    settings: CustomThemeSetting[];
  }>;
  updateSetting: (setting: CustomThemeSetting) => void;
  /** The theme these settings belong to: the active theme unless one is previewed */
  theme?: Theme;
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
  wave: ['title_font', 'body_font'],
};

const ThemeSettings: React.FC<ThemeSettingsProps> = ({ sections, updateSetting, theme }) => {
  const { data: themesData } = useBrowseThemes();
  const activeTheme = theme || themesData?.themes.find((installed: Theme) => installed.active);
  const activeThemeName = activeTheme?.package.name?.toLowerCase() || '';
  const activeThemeAuthor = activeTheme?.package.author?.name || '';
  const { supportsCustomFonts } = useCustomFonts();

  // hides typography related theme settings from official themes
  // should be removed once we remove the settings from the themes in 6.0
  const isHiddenTypographySetting = (key: string) =>
    Boolean(
      themeSettingsMap[activeThemeName]?.includes(key) &&
      activeThemeAuthor === 'Ghost Foundation' &&
      supportsCustomFonts,
    );

  return (
    <>
      {sections.map((section) => {
        const filteredSettings = section.settings.filter((setting) =>
          isCustomThemeSettingVisible(
            setting,
            section.settings.reduce((obj, { key, value }) => ({ ...obj, [key]: value }), {}),
          ),
        );

        const items = filteredSettings.map((setting) => {
          const themeSetting = (
            <ThemeSetting
              key={setting.key}
              setSetting={(value) => updateSetting({ ...setting, value } as CustomThemeSetting)}
              setting={setting}
            />
          );

          if (isHiddenTypographySetting(setting.key)) {
            return (
              <div key={setting.key} className="hidden">
                {themeSetting}
              </div>
            );
          }

          return themeSetting;
        });

        // A section left with nothing to show (e.g. only an official theme's font settings)
        // takes no room and has no heading; its hidden settings stay in the form
        if (filteredSettings.every((setting) => isHiddenTypographySetting(setting.key))) {
          return (
            <div key={section.id} className="hidden">
              {items}
            </div>
          );
        }

        return (
          <FormSection key={section.id} title={section.title}>
            {items}
          </FormSection>
        );
      })}
    </>
  );
};

export default ThemeSettings;
