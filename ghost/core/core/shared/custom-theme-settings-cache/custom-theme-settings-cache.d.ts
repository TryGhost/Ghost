declare class CustomThemeSettingsCache {
    get(key: string): unknown;
    getAll(): object;
    populate(settings: object[]): void;
    clear(): void;
}

export = CustomThemeSettingsCache;
