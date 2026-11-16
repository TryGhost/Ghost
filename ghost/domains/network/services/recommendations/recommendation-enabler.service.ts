type SettingsService = {
  read(key: string): Record<string, { value: unknown }>;
  edit(
    settings: { key: string; value: string }[],
    options: { context: { internal: boolean } },
  ): unknown;
};

/** Reads and writes the setting that says whether the site has recommendations. */
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
