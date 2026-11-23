import React, { useState } from 'react';
import { useLocation } from '@tryghost/admin-x-framework';
import { ActiveSettingsGroupContext } from '@/settings/hooks/use-settings-groups';
import {
  DEFAULT_SETTINGS_GROUP,
  type SettingsGroupId,
  settingsGroupForPath,
} from './settings-groups';

/**
 * Tracks the group the URL shows. A path outside every group, like `/settings`
 * after a modal closes or `about`, keeps the group already showing.
 */
export const ActiveSettingsGroupProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { pathname } = useLocation();
  const pathGroup = settingsGroupForPath(pathname);
  const [group, setGroup] = useState<SettingsGroupId>(pathGroup ?? DEFAULT_SETTINGS_GROUP);

  if (pathGroup && pathGroup !== group) {
    setGroup(pathGroup);
  }

  return (
    <ActiveSettingsGroupContext.Provider value={pathGroup ?? group}>
      {children}
    </ActiveSettingsGroupContext.Provider>
  );
};
