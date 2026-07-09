import {useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore} from 'react';
import {getSettingValue, useBrowseSettings, useEditSettings} from '@tryghost/admin-x-framework/api/settings';
import {
    ADDON_API_VERSION,
    RENDER_TARGETS,
    SHOULD_RENDER_TARGETS,
    type AddonInstallRecord,
    type AddonManifest,
    type AddonTarget
} from '../types.ts';

/**
 * Install records: the instance keeps a list (not a service) of installed
 * add-ons in the `addons` setting — manifest URL, pinned version, integrity
 * hashes, and enabled targets. Bundles are fetched from the provider origin.
 *
 * Updates are automatic: on load the admin re-fetches each record's manifest
 * and, if the provider published a newer api_version-compatible release,
 * re-pins the record (bundle URLs + integrity) and persists it. A provider
 * bump can therefore never brick an instance on an older api_version.
 *
 * For local development, `localStorage['ghost-addons-dev']` may hold a JSON
 * array of manifest URLs; those load unpinned (always latest) and override
 * settings records with the same handle.
 */

export const ADDONS_SETTING_KEY = 'addons';
export const DEV_ADDONS_STORAGE_KEY = 'ghost-addons-dev';

const KNOWN_TARGETS = new Set<string>([...RENDER_TARGETS, ...SHOULD_RENDER_TARGETS]);

/**
 * Calendar api_versions ('2026-01') compare lexicographically. A manifest is
 * compatible when it targets this host's api_version or an earlier one.
 */
export function isApiVersionCompatible(apiVersion: string): boolean {
    return typeof apiVersion === 'string' && apiVersion <= ADDON_API_VERSION;
}

function parseManifest(value: unknown): AddonManifest {
    const manifest = value as Partial<AddonManifest>;
    if (!manifest || typeof manifest !== 'object') {
        throw new Error('Manifest is not an object');
    }
    for (const field of ['name', 'handle', 'version', 'api_version'] as const) {
        if (typeof manifest[field] !== 'string' || manifest[field].length === 0) {
            throw new Error(`Manifest is missing required field "${field}"`);
        }
    }
    if (!Array.isArray(manifest.targeting) || manifest.targeting.length === 0) {
        throw new Error('Manifest declares no targeting entries');
    }
    for (const entry of manifest.targeting) {
        if (!KNOWN_TARGETS.has(entry?.target)) {
            throw new Error(`Manifest declares unknown target "${entry?.target}"`);
        }
        if (typeof entry.bundle !== 'string') {
            throw new Error(`Manifest target "${entry.target}" is missing a bundle URL`);
        }
    }
    return manifest as AddonManifest;
}

/**
 * Pins a fetched manifest into an install record: bundle URLs are resolved
 * against the manifest URL, and the integrity hashes the provider declared
 * for this release are recorded. Trust is anchored on the provider origin —
 * the same root accepted at install.
 */
export function pinManifest(manifest: AddonManifest, manifestUrl: string, enabled = true): AddonInstallRecord {
    return {
        manifestUrl,
        handle: manifest.handle,
        name: manifest.name,
        enabled,
        version: manifest.version,
        apiVersion: manifest.api_version,
        publisher: manifest.publisher,
        description: manifest.description,
        backend: manifest.backend,
        sidebar: manifest.sidebar,
        targeting: manifest.targeting.map(entry => ({
            target: entry.target as AddonTarget,
            bundleUrl: new URL(entry.bundle, manifestUrl).toString(),
            integrity: entry.integrity
        }))
    };
}

export async function fetchManifest(manifestUrl: string): Promise<AddonManifest> {
    const response = await fetch(manifestUrl, {cache: 'no-cache'});
    if (!response.ok) {
        throw new Error(`Failed to fetch add-on manifest (${response.status}): ${manifestUrl}`);
    }
    const manifest = parseManifest(await response.json());
    if (!isApiVersionCompatible(manifest.api_version)) {
        throw new Error(`Add-on "${manifest.handle}" requires api_version ${manifest.api_version}, host implements ${ADDON_API_VERSION}`);
    }
    return manifest;
}

function readDevManifestUrls(): string[] {
    try {
        const raw = window.localStorage.getItem(DEV_ADDONS_STORAGE_KEY);
        const parsed = raw ? JSON.parse(raw) : [];
        return Array.isArray(parsed) ? parsed.filter((url): url is string => typeof url === 'string') : [];
    } catch {
        return [];
    }
}

// localStorage writes don't notify same-tab subscribers, so dev-manifest
// removal bumps a version that useAddonInstalls subscribes to.
let devManifestsVersion = 0;
const devManifestsListeners = new Set<() => void>();

function subscribeDevManifests(listener: () => void): () => void {
    devManifestsListeners.add(listener);
    return () => devManifestsListeners.delete(listener);
}

function getDevManifestsVersion(): number {
    return devManifestsVersion;
}

/** Removes a manifest URL from the dev list and refreshes any mounted hooks. */
export function removeDevManifestUrl(manifestUrl: string): void {
    const remaining = readDevManifestUrls().filter(url => url !== manifestUrl);
    window.localStorage.setItem(DEV_ADDONS_STORAGE_KEY, JSON.stringify(remaining));
    devManifestsVersion += 1;
    devManifestsListeners.forEach(listener => listener());
}

/** Replaces any record with the same handle, appending otherwise. */
export function upsertInstallRecord(records: AddonInstallRecord[], record: AddonInstallRecord): AddonInstallRecord[] {
    return [...records.filter(existing => existing.handle !== record.handle), record];
}

export function removeInstallRecord(records: AddonInstallRecord[], handle: string): AddonInstallRecord[] {
    return records.filter(existing => existing.handle !== handle);
}

export function parseInstallRecords(raw: string | null): AddonInstallRecord[] {
    try {
        const parsed = raw ? JSON.parse(raw) : [];
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
}

export interface UseAddonInstallsResult {
    installs: AddonInstallRecord[];
    isLoading: boolean;
}

export function useAddonInstalls(): UseAddonInstallsResult {
    const {data: settingsData} = useBrowseSettings();
    const {mutateAsync: editSettings} = useEditSettings();
    const [installs, setInstalls] = useState<AddonInstallRecord[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const reconciledRef = useRef(false);
    const devVersion = useSyncExternalStore(subscribeDevManifests, getDevManifestsVersion);

    const settings = settingsData?.settings ?? null;
    const settingsRaw = settingsData ? (getSettingValue<string>(settings, ADDONS_SETTING_KEY) ?? '[]') : null;

    useEffect(() => {
        // Wait for settings so records and dev manifests resolve together.
        if (settingsRaw === null) {
            return;
        }

        let cancelled = false;

        const load = async () => {
            const records = parseInstallRecords(settingsRaw);
            const resolved = new Map<string, AddonInstallRecord>();
            let recordsChanged = false;

            // Settings-backed records, auto-updated against fresh manifests.
            const updated = await Promise.all(records.map(async (record) => {
                try {
                    const manifest = await fetchManifest(record.manifestUrl);
                    if (manifest.handle === record.handle && manifest.version !== record.version) {
                        recordsChanged = true;
                        return pinManifest(manifest, record.manifestUrl, record.enabled);
                    }
                } catch (error) {
                    // Provider unreachable or incompatible release: keep the
                    // existing pin — cached bundles may still load.
                    console.warn('[addons] manifest refresh failed', record.handle, error); // eslint-disable-line no-console
                }
                return record;
            }));
            for (const record of updated) {
                resolved.set(record.handle, record);
            }

            // Dev manifests (unpinned, always latest) override by handle.
            await Promise.all(readDevManifestUrls().map(async (manifestUrl) => {
                try {
                    const manifest = await fetchManifest(manifestUrl);
                    resolved.set(manifest.handle, {...pinManifest(manifest, manifestUrl), dev: true});
                } catch (error) {
                    console.warn('[addons] dev manifest failed to load', manifestUrl, error); // eslint-disable-line no-console
                }
            }));

            if (cancelled) {
                return;
            }

            setInstalls([...resolved.values()]);
            setIsLoading(false);

            // Persist auto-updated pins, once per session, best-effort.
            if (recordsChanged && !reconciledRef.current) {
                reconciledRef.current = true;
                try {
                    await editSettings([{key: ADDONS_SETTING_KEY, value: JSON.stringify(updated)}]);
                } catch (error) {
                    console.warn('[addons] failed to persist auto-updated install records', error); // eslint-disable-line no-console
                }
            }
        };

        load();

        return () => {
            cancelled = true;
        };
    }, [settingsRaw, editSettings, devVersion]);

    return useMemo(() => ({installs, isLoading}), [installs, isLoading]);
}

export interface UseAddonActionsResult {
    /**
     * Fetches and pins the manifest, then persists the install record to the
     * `addons` setting (replacing any record with the same handle). The
     * settings mutation invalidates the browse query, so every mounted
     * useAddonInstalls refreshes on its own.
     */
    install(manifestUrl: string): Promise<AddonInstallRecord>;
    /** Removes the record from the `addons` setting. */
    uninstall(handle: string): Promise<void>;
}

export function useAddonActions(): UseAddonActionsResult {
    const {data: settingsData} = useBrowseSettings();
    const {mutateAsync: editSettings} = useEditSettings();
    const settings = settingsData?.settings ?? null;
    const settingsRaw = getSettingValue<string>(settings, ADDONS_SETTING_KEY) ?? '[]';

    const install = useCallback(async (manifestUrl: string) => {
        const manifest = await fetchManifest(manifestUrl);
        const record = pinManifest(manifest, manifestUrl);
        const records = upsertInstallRecord(parseInstallRecords(settingsRaw), record);
        await editSettings([{key: ADDONS_SETTING_KEY, value: JSON.stringify(records)}]);
        return record;
    }, [settingsRaw, editSettings]);

    const uninstall = useCallback(async (handle: string) => {
        const records = removeInstallRecord(parseInstallRecords(settingsRaw), handle);
        await editSettings([{key: ADDONS_SETTING_KEY, value: JSON.stringify(records)}]);
    }, [settingsRaw, editSettings]);

    return useMemo(() => ({install, uninstall}), [install, uninstall]);
}
