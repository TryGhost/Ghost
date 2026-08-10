import {theme, type Theme} from "../builders/theme";
import {configData} from "./data/config";
import {currentUserData} from "./data/current-user";
import {labsDefaults} from "./data/labs";
import {settingsDefaults, settingsMeta, type SettingValue} from "./data/settings";
import {siteData} from "./data/site";

/**
 * Canned Ghost Admin API responses for the requests an admin client fires on
 * boot regardless of route: settings, config, site, the current user, and the
 * active theme. Test harnesses build their default boot tables from these.
 *
 * The canned data under ./data is the single source of truth for these boot
 * payloads. This package is the root of the test-data dependency graph and
 * must not import from admin-x-framework.
 *
 * Each accessor returns a freshly-minted object graph, so callers can mutate
 * the result without poisoning the canned data.
 *
 * Labs flags default to off; pass `{labs}` to `settingsResponse`/
 * `configResponse` to flip flags for a test (they must flip in both — the
 * admin client reads labs from settings and config).
 */

export interface Setting {
    key: string;
    value: SettingValue;
}

export interface SettingsResponse {
    settings: Setting[];
    meta?: Record<string, unknown>;
}

export interface ConfigResponse {
    config: Record<string, unknown> & {labs?: Record<string, boolean>};
}

export interface SiteResponse {
    site: Record<string, unknown>;
}

export interface CurrentUserResponse {
    users: Array<Record<string, unknown>>;
}

export interface ActiveThemeResponse {
    themes: Theme[];
}

export interface LabsOverrides {
    /** Labs flags merged over the labs defaults (all off). */
    labs?: Record<string, boolean>;
}

export interface SettingsOverrides extends LabsOverrides {
    /**
     * Per-key overrides merged over the settings defaults, e.g.
     * `{title: "My Site"}`. The `labs` setting is controlled by the `labs`
     * option, not this map.
     */
    settings?: Record<string, SettingValue>;
}

// The canned data is pure JSON, so a JSON round-trip is a full deep copy
// (and keeps this module free of environment-specific globals).
function clone<T>(data: T): T {
    return JSON.parse(JSON.stringify(data)) as T;
}

export function settingsResponse({labs, settings}: SettingsOverrides = {}): SettingsResponse {
    const merged: Record<string, SettingValue> = {
        ...settingsDefaults,
        ...settings,
        labs: JSON.stringify({...labsDefaults, ...labs})
    };

    return {
        settings: Object.entries(merged).map(([key, value]) => ({key, value})),
        meta: {filters: {...settingsMeta.filters}}
    };
}

export function configResponse({labs}: LabsOverrides = {}): ConfigResponse {
    const response: ConfigResponse = clone(configData);
    response.config.labs = {...labsDefaults, ...labs};
    return response;
}

export function siteResponse(): SiteResponse {
    return clone(siteData);
}

export function currentUserResponse(): CurrentUserResponse {
    return clone(currentUserData);
}

export interface ActiveThemeOptions {
    /** gscan problems surfaced by the admin sidebar's theme-error banner. */
    errors?: unknown[];
    warnings?: unknown[];
}

export function activeThemeResponse({errors = [], warnings = []}: ActiveThemeOptions = {}): ActiveThemeResponse {
    return {
        themes: [theme({active: true, errors, warnings})]
    };
}
