/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Settings snapshot: async load over the Content API `/settings/` endpoint,
 * producing a SYNCHRONOUS `settings.get(key)` / `getPublic()` port.
 *
 * Ghost calls `settingsCache.get()` synchronously from 15+ render-path files,
 * so the shim must never be async — load once before rendering.
 *
 * The Content API settings payload is (almost) `settingsCache.getPublic()`
 * plus `url`/`version` (see
 * ghost/core/core/server/api/endpoints/utils/serializers/output/settings.js).
 * Non-public keys ghost_head/body_class want are NOT in the payload and
 * resolve to undefined — each is a documented delta in docs/provenance.md:
 * announcement_content, announcement_visibility, heading_font, body_font,
 * members_track_sources, is_private, llms_enabled, machine_payments_enabled,
 * web_analytics_enabled, social_web_enabled, active_theme.
 */
import errors from '@tryghost/errors';
import type {LabsPort, SettingsPort} from './types.ts';

export interface SettingsSnapshot {
    settings: SettingsPort;
    labs: LabsPort;
    /** The raw payload as returned by the Content API */
    raw: Record<string, any>;
}

export function createSettingsCache(payload: Record<string, any>): SettingsSnapshot {
    const snapshot: Record<string, any> = {...payload};

    // The Content API serializer rewrites `icon` to a resized
    // /content/images/size/w256h256/ URL; internally `settingsCache.get('icon')`
    // is the raw upload path and blogIcon applies the resize itself. Undo the
    // rewrite so the copied blogIcon logic doesn't double-apply it.
    if (typeof snapshot.icon === 'string') {
        snapshot.icon = snapshot.icon.replace('/content/images/size/w256h256/', '/content/images/');
    }

    // `settingsCache.get('icon')` (and friends) return site-relative paths in
    // core; the Content API serves absolute URLs. Keep them as-is — urlFor's
    // "already has a protocol" early-return makes absolute inputs pass through.

    const labsFlags: Record<string, boolean> = (snapshot.labs && typeof snapshot.labs === 'object') ? snapshot.labs : {};

    return {
        settings: {
            get(key: string) {
                return snapshot[key];
            },
            getPublic() {
                return {...snapshot};
            }
        },
        labs: {
            getAll() {
                return {...labsFlags};
            },
            isSet(flag: string) {
                return Boolean(labsFlags[flag]);
            }
        },
        raw: payload
    };
}

export interface LoadSettingsOptions {
    siteUrl: string;
    key: string;
    fetch?: typeof globalThis.fetch;
}

export async function loadSettings(options: LoadSettingsOptions): Promise<SettingsSnapshot> {
    const fetchImpl = options.fetch ?? globalThis.fetch;
    const url = new URL('settings/', options.siteUrl.replace(/\/$/, '') + '/ghost/api/content/');
    url.searchParams.set('key', options.key);

    const response = await fetchImpl(url.toString(), {headers: {accept: 'application/json'}});

    if (!response.ok) {
        throw new errors.InternalServerError({
            message: `Failed to load settings from the Content API (status ${response.status})`,
            statusCode: response.status
        });
    }

    const body: any = await response.json();
    return createSettingsCache(body?.settings ?? {});
}
