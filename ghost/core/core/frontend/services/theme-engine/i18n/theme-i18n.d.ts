declare class ThemeI18n {
    constructor(options: {basePath: string});
    init(options?: object): void;
    t(key: string, bindings?: object): string;
}

export = ThemeI18n;
