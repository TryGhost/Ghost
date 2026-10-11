import GlobalSettings, { type GlobalSettingValues } from './global-settings';
import React, { useState } from 'react';
import ThemeSettings from './theme-settings';
import { type CustomThemeSetting } from '@tryghost/admin-x-framework/api/custom-theme-settings';
import { type SettingValue } from '@tryghost/admin-x-framework/api/settings';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@tryghost/shade/components';
import { cn } from '@tryghost/shade/utils';
import type { ThemeSettingSection } from './use-design-form';

/** The design settings: Brand, and the active theme's own settings when it has any. */
const DesignSidebar: React.FC<{
  globalSettings: GlobalSettingValues;
  themeSettingSections: ThemeSettingSection[];
  updateGlobalSetting: (key: string, value: SettingValue) => void;
  updateThemeSetting: (updated: CustomThemeSetting) => void;
  onTabChange?: (id: string) => void;
  /** Merged onto the padded content, e.g. to tighten its padding. */
  className?: string;
}> = ({
  globalSettings,
  themeSettingSections,
  updateGlobalSetting,
  updateThemeSetting,
  onTabChange,
  className,
}) => {
  const [selectedTab, setSelectedTab] = useState('global');

  const handleTabChange = (id: string) => {
    setSelectedTab(id);
    onTabChange?.(id);
  };

  return (
    <div className="flex h-full flex-col justify-between">
      <div className={cn('grow p-7 pt-0', className)} data-testid="design-setting-tabs">
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
