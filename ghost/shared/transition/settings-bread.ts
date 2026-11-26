/** The legacy service that reads and edits settings as the API does. */
import { forSiteWhenAsked } from './for-site';

type SettingsBread = {
  read(key: string): Record<string, { value: unknown }>;
  edit(settings: { key: string; value: unknown }[], options: object): unknown;
};

export const settingsBread = forSiteWhenAsked((): SettingsBread =>
  require('../../core/server/services/settings').getSettingsBREADServiceInstance(),
);
