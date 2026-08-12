/**
 * Admin API access for the dev Labs panel.
 *
 * Uses the same endpoint and payload shape as the real Labs toggle
 * (settings/advanced/labs/feature-toggle.tsx), so there is no new API surface —
 * writing the `labs` setting updates Ghost's settings cache immediately, which
 * is what makes server-side labs.isSet() calls pick the change up.
 *
 * Reads give back the *effective* flag map, not the stored one: on both browse
 * and edit, settings-bread-service overwrites the `labs` value with
 * labs.getAll(), folding in GA flags, the synthetic `members` key and any
 * config.local.json pins. That is deliberate — the switches then show what Ghost
 * actually believes — but it is why writeLab filters before sending.
 *
 * Nothing here reports "no data" as "no flags enabled". A write replaces the
 * whole setting, so an empty map that looked plausible would take every enabled
 * flag with it on the next toggle. Every unexpected shape throws instead.
 */

import {getGhostPaths} from '@tryghost/admin-x-framework/helpers';
import {WRITABLE_FLAGS} from './flags';

export type LabsSettings = Record<string, boolean>;

export type SettingEntry = {key: string; value: unknown};

export type WriteResult = {
    labs: LabsSettings;
    settings: SettingEntry[];
};

export type ApiError = Error & {status?: number};

// Ghost restarting mid-request is routine in the dev stack, and an optimistic
// switch with no in-flight indicator would sit there looking applied forever.
const REQUEST_TIMEOUT_MS = 15000;

export function settingsEndpoint(): string {
    return `${getGhostPaths().apiRoot}/settings/`;
}

async function requestSettings(init?: RequestInit): Promise<SettingEntry[]> {
    const response = await fetch(settingsEndpoint(), {
        credentials: 'include',
        headers: {'Content-Type': 'application/json'},
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        ...init
    });

    if (!response.ok) {
        const error: ApiError = new Error(`${response.status} ${response.statusText}`);

        error.status = response.status;
        throw error;
    }

    const body = await response.json() as {settings?: SettingEntry[]};

    if (!Array.isArray(body.settings)) {
        throw new Error('Settings response had no settings array');
    }

    return body.settings;
}

function extractLabs(settings: SettingEntry[]): LabsSettings {
    const raw = settings.find(setting => setting.key === 'labs')?.value;

    if (typeof raw !== 'string') {
        throw new Error('Settings response had no labs value');
    }

    const parsed = JSON.parse(raw) as Record<string, unknown>;

    return Object.fromEntries(
        Object.entries(parsed).map(([key, value]) => [key, value === true])
    );
}

export async function readLabs(): Promise<LabsSettings> {
    return extractLabs(await requestSettings());
}

export async function writeLab(labs: LabsSettings, flag: string, enabled: boolean): Promise<WriteResult> {
    // A read returns the effective map, so strip everything the allowlist would
    // reject before echoing it back — the server filters too, but there is no
    // reason to send GA flags and config pins it will only throw away.
    const writable = Object.entries(labs).filter(([key]) => WRITABLE_FLAGS.has(key));
    const next = {...Object.fromEntries(writable), [flag]: enabled};

    const settings = await requestSettings({
        method: 'PUT',
        body: JSON.stringify({settings: [{key: 'labs', value: JSON.stringify(next)}]})
    });

    // The raw list rides along because Ember's state bridge takes the whole
    // settings response, not just the flags.
    return {labs: extractLabs(settings), settings};
}
