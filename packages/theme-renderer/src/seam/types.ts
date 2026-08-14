/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * The injected dependency surface for @tryghost/theme-renderer.
 *
 * This is the package's data seam (template-renderer-spec principle #5): every
 * copied helper/meta file reaches Ghost core state exclusively through these
 * ports. The surface mirrors the seam list in docs/extraction-map.md §(b).
 */

/**
 * Synchronous settings snapshot. Ghost calls `settingsCache.get()` sync from
 * 15+ files, so this port must never be async — populate it up front via
 * `loadSettings()` (see ./settings.ts).
 */
export interface SettingsPort {
    get(key: string): any;
    getPublic(): Record<string, any>;
}

export interface CustomThemeSettingsPort {
    getAll(): Record<string, any>;
}

export interface LabsPort {
    isSet(flag: string): boolean;
    getAll(): Record<string, boolean>;
}

export interface ConfigPort {
    get(key: string): any;
    isPrivacyDisabled(key: string): boolean;
    getContentPath?(type: string): string;
}

export interface SettingsHelpersPort {
    isWebAnalyticsEnabled(): boolean;
    isStripeConnected(): boolean;
    getMembersValidationKey?(): string | null;
}

/**
 * Mirrors the subset of @tryghost/url-utils that the frontend render path
 * uses (see ./url-utils.ts for the default implementation).
 */
export interface UrlUtilsPort {
    urlFor(context: any, data?: any, absolute?: boolean): string;
    urlJoin(...parts: any[]): string;
    getSiteUrl(): string;
    getAdminUrl(): string | undefined;
    getSubdir(): string;
    relativeToAbsolute(url: string, options?: any): string;
    absoluteToRelative(url: string, options?: any): string;
    createUrl(urlPath?: string, absolute?: boolean, trailingSlash?: boolean): string;
    replacePermalink(permalink: string, resource: any, timezone?: string): string;
    isSiteUrl?(url: URL, context?: string): boolean;
    readonly STATIC_IMAGE_URL_PREFIX: string;
}

export interface UrlServicePort {
    /** sync — see lazy-url-service.ts getUrlForResource */
    getUrlForResource(resource: any, options?: {absolute?: boolean; withSubdirectory?: boolean}): string;
    /** sync */
    ownsResource(identifier: string, resource: any): boolean;
}

export interface ApiBrowseOptions {
    filter?: string;
    limit?: string | number;
    include?: string;
    fields?: string;
    formats?: string;
    page?: string | number;
    order?: string;
    id?: string;
    slug?: string;
    visibility?: string;
    context?: {member?: any; giftToken?: string};
    [key: string]: any;
}

export interface ApiController {
    browse(options?: ApiBrowseOptions): Promise<any>;
    read(options?: ApiBrowseOptions): Promise<any>;
}

/**
 * In-process Content API shape (`server/api/endpoints` pipeline 'content').
 * The default binding speaks HTTP Content API over fetch — see ./content-api.ts.
 */
export interface ContentApiPort {
    postsPublic: ApiController;
    pagesPublic: ApiController;
    tagsPublic: ApiController;
    authorsPublic: ApiController;
    tiersPublic?: ApiController;
    newslettersPublic?: ApiController;
    /** {{total_members}} → api.stats.memberCountHistory.query() — optional, stubbed */
    stats?: {memberCountHistory: {query(): Promise<any>}};
    [controller: string]: any;
}

export interface AssetHashPort {
    /** Content-based hash for a single file; null lets callers fall back to the global hash */
    getHashForFile(path: string): string | null;
    clearCache(): void;
    /** Global (per-boot in Ghost) asset hash; a constant in the seam default */
    readonly globalHash: string;
}

export interface CardAssetsPort {
    hasFile(type: 'js' | 'css'): boolean;
}

export interface BlogIconPort {
    getIconUrl(options?: {absolute?: boolean; fallbackToDefault?: boolean}): string | null;
    getIconType(icon?: string): string;
    getIconExt(icon?: string): string;
}

export interface ImageSizeCachePort {
    getCachedImageSizeFromUrl(url: string): Promise<{width: number; height: number} | null | undefined>;
}

export interface I18nPort {
    t(key: string, bindings?: Record<string, any>): string;
}

export interface LoggingPort {
    info(...args: any[]): void;
    warn(...args: any[]): void;
    error(...args: any[]): void;
}

/**
 * Port over `theme-engine/active.js` ActiveTheme — only what helpers/meta need.
 */
export interface ActiveThemePort {
    name: string;
    path?: string;
    partialsPath?: string;
    hasTemplate(name: string): boolean;
    config(key: string): any;
    updateTemplateOptions?(options: Record<string, any>): void;
}

export interface MiscPort {
    getFrontendKey(): Promise<string | null>;
    /** storageUtils.isInternalImage */
    isInternalImage(url: string): boolean;
    /** routing registry getRssUrl */
    getRssUrl(options?: {absolute?: boolean}): string | null;
    /** @tryghost/image-transform canTransformToFormat */
    canTransformToFormat(format: string): boolean;
}

/**
 * The aggregate injected into the package before rendering.
 */
export interface RendererDeps {
    settings: SettingsPort;
    customThemeSettings: CustomThemeSettingsPort;
    labs: LabsPort;
    config: ConfigPort;
    settingsHelpers: SettingsHelpersPort;
    urlUtils: UrlUtilsPort;
    urlService: UrlServicePort;
    api: ContentApiPort;
    assetHash: AssetHashPort;
    cardAssets: CardAssetsPort;
    blogIcon: BlogIconPort;
    imageSizeCache: ImageSizeCachePort;
    activeTheme?: ActiveThemePort;
    themeI18n: I18nPort;
    themeI18next: I18nPort;
    logging: LoggingPort;
    misc: MiscPort;
}

/**
 * Minimal registration surface the helpers layer needs from the template
 * engine. Deliberately defined here (NOT imported from src/engine) so the
 * helpers layer has no compile-time dependency on the engine — the assembly
 * step adapts the engine to this interface.
 *
 * `registerAsyncHelper` follows the express-hbs contract: the wrapped fn is
 * called with (context, options?, cb) and must eventually invoke cb(result);
 * the engine substitutes a placeholder token that is later replaced.
 */
export interface HelperRegistrar {
    registerHelper(name: string, fn: (...args: any[]) => any): void;
    registerAsyncHelper(name: string, fn: (this: any, context: any, options: any, cb: (result: any) => void) => void): void;
}
