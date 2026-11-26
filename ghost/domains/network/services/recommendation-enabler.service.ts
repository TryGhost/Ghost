import type { Site } from '#support/site';
import { settingsBread } from '../../../shared/transition/settings-bread';

type SettingsService = {
  read(key: string): Record<string, { value: unknown }>;
  edit(settings: { key: string; value: unknown }[], options: object): unknown;
};

/** Reads and changes whether the site shows recommendations. */
export class RecommendationEnablerService {
  #settingsService: SettingsService;

  constructor(deps: { settingsService: SettingsService }) {
    this.#settingsService = deps.settingsService;
  }

  getSetting(): string {
    const setting = this.#settingsService.read('recommendations_enabled').recommendations_enabled!;
    return String(setting.value);
  }

  async setSetting(value: string): Promise<void> {
    this.#settingsService.edit([{ key: 'recommendations_enabled', value }], {
      context: { internal: true },
    });
  }
}

export const recommendationEnabler = (site: Site) =>
  new RecommendationEnablerService({ settingsService: settingsBread(site) });
