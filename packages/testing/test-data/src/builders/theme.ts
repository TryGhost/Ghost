import {createBuilder} from "../factory";

/**
 * Ghost Admin API theme resource, as returned by the browse (`/themes/`),
 * active (`/themes/active/`), install and activate endpoints.
 *
 * The package metadata is deliberately trimmed to the fields the admin UI
 * reads (`package.name`, `package.description`, `package.version`,
 * `package.author.name`) — the real API echoes the theme's entire
 * package.json, but none of that (scripts, devDependencies, config, ...) is
 * consumed by any admin client.
 */
export interface ThemePackage {
    name?: string;
    description?: string;
    version?: string;
    author?: {
        name?: string;
    };
}

export interface Theme {
    name: string;
    package: ThemePackage;
    active: boolean;
    templates: unknown[];
    /** gscan problems surfaced by install/activate flows and the admin sidebar's theme-error banner. */
    errors: unknown[];
    warnings: unknown[];
}

/** Defaults to an inactive casper — override `active` (and `name`) as needed. */
export const theme = createBuilder<Theme>(() => ({
    name: "casper",
    package: {
        name: "casper",
        description: "A clean, minimal default theme for the Ghost publishing platform",
        version: "5.4.10",
        author: {
            name: "Ghost Foundation"
        }
    },
    active: false,
    templates: [],
    errors: [],
    warnings: []
}));

export interface ThemesResponse {
    themes: Theme[];
}

/** `/themes/` browse envelope (no pagination meta, unlike most browse endpoints). */
function themesListResponse(themes: Theme[]): ThemesResponse {
    return {themes};
}

/**
 * The canned two-theme list the settings design/theme acceptance specs run
 * against: casper installed but inactive, edition active. Specs look these up
 * by name and flip `active` per test.
 */
export function defaultThemesResponse(): ThemesResponse {
    return themesListResponse([
        theme(),
        theme({
            name: "edition",
            package: {
                name: "edition",
                description: "A clean, minimal newsletter theme for the Ghost publishing platform",
                version: "1.0.0",
                author: {
                    name: "Ghost Foundation"
                }
            },
            active: true
        })
    ]);
}
