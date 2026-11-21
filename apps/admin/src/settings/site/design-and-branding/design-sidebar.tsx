import GlobalSettings, { type GlobalSettingValues } from './global-settings';
import React from 'react';
import { useLocation, useSearchParams } from '@tryghost/admin-x-framework';
import FormSection from '@/settings/components/form-section';
import ThemeSettings from './theme-settings';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@tryghost/shade/components';
import { type CustomThemeSetting } from '@tryghost/admin-x-framework/api/custom-theme-settings';
import { type SettingValue } from '@tryghost/admin-x-framework/api/settings';
import { type Theme } from '@tryghost/admin-x-framework/api/themes';
import { getThemeDisplayName } from './theme-names';
import type { ThemeSettingSection } from './use-design-form';

/**
 * The design settings: Brand, and Theme: which theme (when a picker is given)
 * and its own settings.
 */
const DesignSidebar: React.FC<{
  globalSettings: GlobalSettingValues;
  themeSettingSections: ThemeSettingSection[];
  updateGlobalSetting: (key: string, value: SettingValue) => void;
  updateThemeSetting: (updated: CustomThemeSetting) => void;
  /** An installed theme shown instead of the active one; its settings are the ones edited */
  previewTheme?: Theme;
  activeTheme?: Theme;
  /** Picks the theme the settings show; puts the Theme tab up even for a theme without settings */
  themePicker?: React.ReactNode;
  /** The variants the shown theme can start from, when it has any (see ThemeVariantPicker) */
  themeVariantPicker?: React.ReactNode;
  themeSettingsLoading?: boolean;
  /** The previewed theme's settings couldn't be loaded */
  themeSettingsError?: boolean;
}> = ({
  globalSettings,
  themeSettingSections,
  updateGlobalSetting,
  updateThemeSetting,
  previewTheme,
  activeTheme,
  themePicker,
  themeVariantPicker,
  themeSettingsLoading,
  themeSettingsError,
}) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const routeState: unknown = location.state;
  const selectedTab = searchParams.get('tab') === 'theme' ? 'theme-settings' : 'global';
  const shownTheme = previewTheme || activeTheme;

  const handleTabChange = (id: string) => {
    const params = new URLSearchParams(searchParams);
    params.set('tab', id === 'theme-settings' ? 'theme' : 'brand');
    setSearchParams(params, { replace: true, state: routeState });
  };

  return (
    <div className="flex h-full flex-col justify-between">
      <div className="grow p-7 pt-0" data-testid="design-setting-tabs">
        {themeSettingSections.length > 0 || themePicker ? (
          <Tabs value={selectedTab} variant="underline" onValueChange={handleTabChange}>
            <TabsList className="sticky top-0 z-50 bg-surface-elevated-2">
              <TabsTrigger value="global">Brand</TabsTrigger>
              <TabsTrigger value="theme-settings">Theme</TabsTrigger>
            </TabsList>
            <TabsContent value="global">
              <GlobalSettings updateSetting={updateGlobalSetting} values={globalSettings} />
            </TabsContent>
            <TabsContent value="theme-settings">
              {themePicker && (
                <FormSection title="Theme settings">
                  {themePicker}
                  {themeVariantPicker}
                </FormSection>
              )}
              {themePicker && shownTheme && themeSettingsError && (
                <p className="mt-8 text-sm text-text-secondary" role="alert">
                  {getThemeDisplayName(shownTheme)}&apos;s settings couldn&apos;t be loaded. Try
                  again, or pick another theme.
                </p>
              )}
              {themePicker &&
                shownTheme &&
                !themeSettingsLoading &&
                !themeSettingsError &&
                themeSettingSections.length === 0 && (
                  <p className="mt-8 text-sm text-text-secondary">
                    {getThemeDisplayName(shownTheme)} has no settings of its own. Brand settings
                    still apply.
                  </p>
                )}
              <ThemeSettings
                // Each theme's settings start fresh, without the last theme's field state
                key={previewTheme?.name || 'active'}
                sections={themeSettingSections}
                theme={previewTheme}
                updateSetting={updateThemeSetting}
              />
            </TabsContent>
          </Tabs>
        ) : (
          <GlobalSettings updateSetting={updateGlobalSetting} values={globalSettings} />
        )}
      </div>
    </div>
  );
};

export default DesignSidebar;
