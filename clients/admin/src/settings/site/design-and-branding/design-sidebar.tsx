import GlobalSettings, { type GlobalSettingValues } from './global-settings';
import React from 'react';
import { useLocation, useSearchParams } from '@tryghost/admin-x-framework';
import ThemeSettings from './theme-settings';
import { type CustomThemeSetting } from '@tryghost/admin-x-framework/api/custom-theme-settings';
import { type SettingValue } from '@tryghost/admin-x-framework/api/settings';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@tryghost/shade/components';
import type { ThemeSettingSection } from './use-design-form';

/** The design settings: Brand, and the active theme's own settings when it has any. */
const DesignSidebar: React.FC<{
  globalSettings: GlobalSettingValues;
  themeSettingSections: ThemeSettingSection[];
  updateGlobalSetting: (key: string, value: SettingValue) => void;
  updateThemeSetting: (updated: CustomThemeSetting) => void;
}> = ({ globalSettings, themeSettingSections, updateGlobalSetting, updateThemeSetting }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const routeState: unknown = location.state;
  const selectedTab = searchParams.get('tab') === 'theme' ? 'theme-settings' : 'global';

  const handleTabChange = (id: string) => {
    const params = new URLSearchParams(searchParams);
    params.set('tab', id === 'theme-settings' ? 'theme' : 'brand');
    setSearchParams(params, { replace: true, state: routeState });
  };

  return (
    <div className="flex h-full flex-col justify-between">
      <div className="grow p-7 pt-0" data-testid="design-setting-tabs">
        {themeSettingSections.length > 0 ? (
          <Tabs value={selectedTab} variant="underline" onValueChange={handleTabChange}>
            <TabsList className="sticky top-0 z-50 bg-surface-elevated-2">
              <TabsTrigger value="global">Brand</TabsTrigger>
              <TabsTrigger value="theme-settings">Theme</TabsTrigger>
            </TabsList>
            <TabsContent value="global">
              <GlobalSettings updateSetting={updateGlobalSetting} values={globalSettings} />
            </TabsContent>
            <TabsContent value="theme-settings">
              <ThemeSettings sections={themeSettingSections} updateSetting={updateThemeSetting} />
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
