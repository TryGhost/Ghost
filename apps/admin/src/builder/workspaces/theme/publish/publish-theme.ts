import {extractThemeArchive, isDefaultThemeName, packThemeArchive} from '@tryghost/theme-renderer/editor/archive';

import {cloneThemeDraft, withThemeRevision} from '@/builder/workspaces/theme/theme-state';

import type {PublishResult} from '@/builder/core/workspace';
import type {ThemeEditorFile} from '@tryghost/theme-renderer/editor/archive';
import type {ThemeCustomSetting, ThemeDraft, ThemeGlobalSettings} from '@/builder/workspaces/theme/theme-state';

export type ThemePublishStage = 'idle' | 'validation' | 'upload' | 'activation' | 'settings' | 'complete';

export type ThemePublishState = {
    status: 'idle' | 'publishing' | 'failed' | 'complete';
    stage: ThemePublishStage;
    targetName?: string;
    error?: string;
    retryable?: boolean;
};

export type ThemeUpload = {
    archive: Blob;
    name: string;
    copySettingsFrom?: string;
};

export type ThemeSettingUpdate = {
    key: string;
    value: string | boolean | null;
};

export type ThemePublishTransport = {
    download?: (name: string, signal: AbortSignal) => Promise<ArrayBuffer>;
    upload: (input: ThemeUpload, signal: AbortSignal) => Promise<void>;
    activate: (name: string, signal: AbortSignal) => Promise<void>;
    updateGlobalSettings: (settings: ThemeSettingUpdate[], signal: AbortSignal) => Promise<void>;
    updateCustomSettings: (settings: ThemeSettingUpdate[], signal: AbortSignal) => Promise<void>;
};

type GhostApiErrorBody = {
    errors?: Array<{message?: string}>;
};

export class ThemePublishRequestError extends Error {
    readonly status: number;

    constructor(status: number, message: string) {
        super(message);
        this.name = 'ThemePublishRequestError';
        this.status = status;
    }
}

export type ThemePublishResult = PublishResult & {draft?: ThemeDraft};

type PublishOptions = {
    copyName?: string;
};

type PublishAttempt = {
    key: string;
    draft: ThemeDraft;
    targetName: string;
    archive: Blob | null;
    validated: boolean;
    uploaded: boolean;
    activated: boolean;
    globalSettingsUpdated: boolean;
    customSettingsUpdated: boolean;
    globalSettingsUpdates: ThemeSettingUpdate[] | null;
    customSettingsUpdates: ThemeSettingUpdate[] | null;
};

const themeNamePattern = /^[a-z0-9][\w-]{0,63}$/;

function errorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
}

function abortIfNeeded(signal: AbortSignal): void {
    if (signal.aborted) {
        throw new DOMException('Aborted', 'AbortError');
    }
}

function isAbortError(error: unknown): boolean {
    return error instanceof DOMException && error.name === 'AbortError';
}

export function validateThemeCopyName(input: string | undefined, sourceName: string, installedThemeNames: readonly string[] = []): {ok: true; name: string} | {ok: false; message: string} {
    const name = (input ?? `${sourceName}-edited`).trim().toLowerCase();
    if (!themeNamePattern.test(name)) {
        return {ok: false, message: 'Use 1–64 characters, starting with a letter or number. Only letters, numbers, dashes, and underscores are allowed.'};
    }
    if (isDefaultThemeName(name)) {
        return {ok: false, message: 'Built-in themes cannot be overwritten. Choose a different name for the copy.'};
    }
    if (installedThemeNames.some(installed => installed.toLowerCase() === name)) {
        return {ok: false, message: `A theme named “${name}” is already installed. Choose a different name for this copy.`};
    }
    return {ok: true, name};
}

async function requestGhostApi(apiRoot: string, path: string, init: RequestInit, signal: AbortSignal): Promise<void> {
    const response = await fetch(`${apiRoot.replace(/\/$/, '')}${path}`, {
        ...init,
        credentials: 'include',
        headers: {
            Accept: 'application/json',
            ...init.headers
        },
        signal
    });
    if (response.ok) {
        return;
    }
    const body = await response.json().catch(() => null) as GhostApiErrorBody | null;
    throw new ThemePublishRequestError(response.status, body?.errors?.[0]?.message || `Ghost Admin API request failed (${response.status}).`);
}

export function createAdminThemePublishTransport(apiRoot: string): ThemePublishTransport {
    return {
        download: async (name, signal) => {
            const response = await fetch(`${apiRoot.replace(/\/$/, '')}/themes/${encodeURIComponent(name)}/download/`, {
                credentials: 'include',
                headers: {Accept: 'application/zip, application/octet-stream, */*'},
                signal
            });
            if (!response.ok) {
                throw new Error(`Could not verify the installed theme before publishing (${response.status}).`);
            }
            return response.arrayBuffer();
        },
        upload: ({archive, name, copySettingsFrom}, signal) => {
            const formData = new FormData();
            formData.append('file', archive, `${name}.zip`);
            const query = copySettingsFrom ? `?copy_settings_from=${encodeURIComponent(copySettingsFrom)}` : '';
            return requestGhostApi(apiRoot, `/themes/upload/${query}`, {method: 'POST', body: formData}, signal);
        },
        activate: (name, signal) => requestGhostApi(apiRoot, `/themes/${encodeURIComponent(name)}/activate/`, {method: 'PUT'}, signal),
        updateGlobalSettings: (settings, signal) => requestGhostApi(apiRoot, '/settings/', {
            method: 'PUT',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({settings})
        }, signal),
        updateCustomSettings: (settings, signal) => requestGhostApi(apiRoot, '/custom_theme_settings/', {
            method: 'PUT',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({custom_theme_settings: settings})
        }, signal)
    };
}

function editorFiles(draft: ThemeDraft): Record<string, ThemeEditorFile> {
    return Object.fromEntries(Object.entries(draft.files).map(([path, file]) => [path, {
        path,
        editable: file.kind === 'text',
        content: file.content,
        binary: file.binary ? new Uint8Array(file.binary) : null,
        date: new Date(0),
        unixPermissions: file.unixPermissions,
        dosPermissions: file.dosPermissions
    }]));
}

function validatePackageFile(draft: ThemeDraft): void {
    const packageFile = Object.hasOwn(draft.files, 'package.json') ? draft.files['package.json'] : undefined;
    if (!packageFile || packageFile.kind !== 'text' || packageFile.content === null) {
        throw new Error('The theme must contain a readable package.json file before it can be published.');
    }
    let parsed: unknown;
    try {
        parsed = JSON.parse(packageFile.content);
    } catch {
        throw new Error('The theme package.json file is not valid JSON.');
    }
    const metadata = parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as Record<string, unknown> : null;
    if (!metadata || !Object.hasOwn(metadata, 'name') || typeof metadata.name !== 'string' || !metadata.name.trim()) {
        throw new Error('The theme package.json file must contain a non-empty theme name.');
    }
}

function changedGlobalSettings(current: ThemeGlobalSettings, baseline: ThemeGlobalSettings): ThemeSettingUpdate[] {
    return (Object.keys(current) as Array<keyof ThemeGlobalSettings>).flatMap(key => Object.is(current[key], baseline[key]) ? [] : [{key, value: current[key]}]);
}

function changedCustomSettings(current: Record<string, ThemeCustomSetting>, baseline: Record<string, ThemeCustomSetting>): ThemeSettingUpdate[] {
    return Object.keys(current).sort().flatMap((key) => {
        const setting = current[key];
        const previous = Object.hasOwn(baseline, key) ? baseline[key] : undefined;
        return previous && Object.is(setting.value, previous.value) ? [] : [{key: setting.key, value: setting.value}];
    });
}

function globalSettingsForAttempt(current: ThemeGlobalSettings, baseline: ThemeGlobalSettings, uncertainKeys: ReadonlySet<string>): ThemeSettingUpdate[] {
    const updates = changedGlobalSettings(current, baseline);
    const included = new Set(updates.map(update => update.key));
    for (const key of uncertainKeys) {
        if (!included.has(key) && Object.hasOwn(current, key)) {
            updates.push({key, value: current[key as keyof ThemeGlobalSettings]});
        }
    }
    return updates;
}

function customSettingsForAttempt(current: Record<string, ThemeCustomSetting>, baseline: Record<string, ThemeCustomSetting>, uncertainKeys: ReadonlySet<string>): ThemeSettingUpdate[] {
    const updates = changedCustomSettings(current, baseline);
    const included = new Set(updates.map(update => update.key));
    for (const key of uncertainKeys) {
        const setting = Object.hasOwn(current, key) ? current[key] : undefined;
        if (setting && !included.has(key)) {
            updates.push({key: setting.key, value: setting.value});
        }
    }
    return updates;
}

function bytesEqual(left: Uint8Array | null, right: Uint8Array | null): boolean {
    return left === right || Boolean(left && right && left.byteLength === right.byteLength && left.every((byte, index) => byte === right[index]));
}

function archiveMatchesDraft(snapshot: Awaited<ReturnType<typeof extractThemeArchive>>, draft: ThemeDraft): boolean {
    const paths = Object.keys(draft.files).sort();
    const archivePaths = Object.keys(snapshot.files).sort();
    return paths.length === archivePaths.length && paths.every((path, index) => {
        if (path !== archivePaths[index]) {
            return false;
        }
        const expected = draft.files[path];
        const actual = snapshot.files[path];
        return actual.path === expected.path
            && actual.editable === (expected.kind === 'text')
            && actual.content === expected.content
            && bytesEqual(actual.binary, expected.binary)
            && actual.unixPermissions === expected.unixPermissions
            && actual.dosPermissions === expected.dosPermissions;
    });
}

export class ThemePublisher {
    private serverBaseline: ThemeDraft;
    private serverGlobalSettings: ThemeGlobalSettings;
    private serverCustomSettings: Record<string, ThemeCustomSetting>;
    private lastAttemptedUpload: {name: string; draft: ThemeDraft} | null = null;
    private readonly uncertainGlobalSettingKeys = new Set<string>();
    private readonly uncertainCustomSettingKeys = new Set<string>();
    private readonly transport: ThemePublishTransport;
    private readonly installedThemeNames: readonly string[];
    private readonly onServerMutation: () => void;
    private readonly listeners = new Set<(state: ThemePublishState) => void>();
    private currentAttempt: PublishAttempt | null = null;
    private currentState: ThemePublishState = {status: 'idle', stage: 'idle'};

    constructor({baseline, transport, installedThemeNames = [], onServerMutation = () => {}}: {baseline: ThemeDraft; transport: ThemePublishTransport; installedThemeNames?: readonly string[]; onServerMutation?: () => void}) {
        this.serverBaseline = cloneThemeDraft(baseline);
        this.serverGlobalSettings = structuredClone(baseline.globalSettings);
        this.serverCustomSettings = structuredClone(baseline.customSettings);
        this.transport = transport;
        this.installedThemeNames = [...installedThemeNames];
        this.onServerMutation = onServerMutation;
    }

    get state(): ThemePublishState {
        return this.currentState;
    }

    subscribe(listener: (state: ThemePublishState) => void): () => void {
        this.listeners.add(listener);
        listener(this.currentState);
        return () => this.listeners.delete(listener);
    }

    async publish(draft: ThemeDraft, options: PublishOptions, signal: AbortSignal): Promise<ThemePublishResult> {
        abortIfNeeded(signal);
        const target = draft.theme.builtIn ? validateThemeCopyName(options.copyName, draft.theme.name, this.installedThemeNames) : {ok: true as const, name: draft.theme.name};
        if (!target.ok) {
            this.currentAttempt = null;
            return this.failure(draft, 'validation', target.message, false);
        }

        const key = `${draft.revision}:${target.name}`;
        if (this.currentAttempt?.key !== key) {
            this.currentAttempt = {
                key,
                draft: cloneThemeDraft(draft),
                targetName: target.name,
                archive: null,
                validated: false,
                uploaded: false,
                activated: !draft.theme.builtIn,
                globalSettingsUpdated: false,
                customSettingsUpdated: false,
                globalSettingsUpdates: null,
                customSettingsUpdates: null
            };
        }
        const attempt = this.currentAttempt;

        try {
            if (!attempt.validated) {
                this.setState({status: 'publishing', stage: 'validation', targetName: target.name});
                validatePackageFile(attempt.draft);
                const rootPrefix = attempt.draft.theme.builtIn && attempt.draft.theme.rootPrefix ? `${target.name}/` : attempt.draft.theme.rootPrefix;
                attempt.archive = await packThemeArchive({files: editorFiles(attempt.draft), rootPrefix});
                await extractThemeArchive(await attempt.archive.arrayBuffer());
                abortIfNeeded(signal);
                attempt.validated = true;
            }

            if (!attempt.uploaded) {
                if (!attempt.draft.theme.builtIn && this.transport.download) {
                    this.setState({status: 'publishing', stage: 'validation', targetName: target.name});
                    let installedArchive: ArrayBuffer;
                    try {
                        installedArchive = await this.transport.download(attempt.draft.theme.name, signal);
                    } catch (error) {
                        if (isAbortError(error) || signal.aborted) {
                            throw error;
                        }
                        return this.failure(draft, 'validation', errorMessage(error), true);
                    }
                    const installed = await extractThemeArchive(installedArchive);
                    const lastAttemptedUpload = this.lastAttemptedUpload;
                    const matchesLastAttempt = lastAttemptedUpload?.name === attempt.draft.theme.name && archiveMatchesDraft(installed, lastAttemptedUpload.draft);
                    if (archiveMatchesDraft(installed, this.serverBaseline)) {
                        // The server is still at the last version Builder observed; upload below.
                    } else if (matchesLastAttempt && lastAttemptedUpload) {
                        this.serverBaseline = cloneThemeDraft(lastAttemptedUpload.draft);
                        if (archiveMatchesDraft(installed, attempt.draft)) {
                            attempt.uploaded = true;
                            this.onServerMutation();
                        }
                    } else if (archiveMatchesDraft(installed, attempt.draft)) {
                        attempt.uploaded = true;
                        this.serverBaseline = cloneThemeDraft(attempt.draft);
                        this.onServerMutation();
                    } else {
                        return this.failure(draft, 'validation', 'The installed theme changed after Builder was opened. Reload Builder before publishing so newer theme edits are not overwritten.', false, 'publish_conflict');
                    }
                }
            }

            if (!attempt.uploaded) {
                this.setState({status: 'publishing', stage: 'upload', targetName: target.name});
                this.onServerMutation();
                if (!attempt.draft.theme.builtIn) {
                    this.lastAttemptedUpload = {name: attempt.draft.theme.name, draft: cloneThemeDraft(attempt.draft)};
                }
                await this.transport.upload({
                    archive: attempt.archive!,
                    name: target.name,
                    copySettingsFrom: draft.theme.builtIn ? draft.theme.name : undefined
                }, signal);
                abortIfNeeded(signal);
                attempt.uploaded = true;
                this.serverBaseline = cloneThemeDraft(attempt.draft);
                this.lastAttemptedUpload = null;
            }

            if (!attempt.activated) {
                this.setState({status: 'publishing', stage: 'activation', targetName: target.name});
                this.onServerMutation();
                await this.transport.activate(target.name, signal);
                abortIfNeeded(signal);
                attempt.activated = true;
            }

            attempt.globalSettingsUpdates ??= globalSettingsForAttempt(attempt.draft.globalSettings, this.serverGlobalSettings, this.uncertainGlobalSettingKeys);
            attempt.customSettingsUpdates ??= customSettingsForAttempt(attempt.draft.customSettings, this.serverCustomSettings, this.uncertainCustomSettingKeys);
            if (!attempt.globalSettingsUpdated) {
                this.setState({status: 'publishing', stage: 'settings', targetName: target.name});
                if (attempt.globalSettingsUpdates.length > 0) {
                    this.onServerMutation();
                    attempt.globalSettingsUpdates.forEach(update => this.uncertainGlobalSettingKeys.add(update.key));
                    this.serverGlobalSettings = structuredClone(attempt.draft.globalSettings);
                    await this.transport.updateGlobalSettings(attempt.globalSettingsUpdates, signal);
                    abortIfNeeded(signal);
                    attempt.globalSettingsUpdates.forEach(update => this.uncertainGlobalSettingKeys.delete(update.key));
                }
                attempt.globalSettingsUpdated = true;
            }
            if (!attempt.customSettingsUpdated) {
                this.setState({status: 'publishing', stage: 'settings', targetName: target.name});
                if (attempt.customSettingsUpdates.length > 0) {
                    this.onServerMutation();
                    attempt.customSettingsUpdates.forEach(update => this.uncertainCustomSettingKeys.add(update.key));
                    this.serverCustomSettings = structuredClone(attempt.draft.customSettings);
                    await this.transport.updateCustomSettings(attempt.customSettingsUpdates, signal);
                    abortIfNeeded(signal);
                    attempt.customSettingsUpdates.forEach(update => this.uncertainCustomSettingKeys.delete(update.key));
                }
                attempt.customSettingsUpdated = true;
            }

            const published = await withThemeRevision({
                ...cloneThemeDraft(attempt.draft),
                theme: {
                    ...attempt.draft.theme,
                    name: target.name,
                    builtIn: false,
                    rootPrefix: attempt.draft.theme.builtIn && attempt.draft.theme.rootPrefix ? `${target.name}/` : attempt.draft.theme.rootPrefix
                }
            });
            this.serverBaseline = cloneThemeDraft(published);
            this.serverGlobalSettings = structuredClone(published.globalSettings);
            this.serverCustomSettings = structuredClone(published.customSettings);
            this.lastAttemptedUpload = null;
            this.uncertainGlobalSettingKeys.clear();
            this.uncertainCustomSettingKeys.clear();
            this.setState({status: 'complete', stage: 'complete', targetName: target.name});
            return {ok: true, revision: published.revision, draft: published};
        } catch (error) {
            if (isAbortError(error) || signal.aborted) {
                throw error;
            }
            if (error instanceof ThemePublishRequestError && error.status === 422) {
                if (!attempt.uploaded) {
                    this.lastAttemptedUpload = null;
                    return this.failure(draft, 'validation', error.message, false);
                }
                if (!attempt.activated) {
                    return this.failure(draft, 'activation', error.message, false);
                }
                return this.failure(draft, 'settings', error.message, false);
            }
            if (!attempt.validated) {
                return this.failure(draft, 'validation', errorMessage(error), false);
            }
            if (!attempt.uploaded) {
                return this.failure(draft, 'upload', errorMessage(error), true);
            }
            if (!attempt.activated) {
                return this.failure(draft, 'activation', errorMessage(error), true);
            }
            return this.failure(draft, 'settings', errorMessage(error), true);
        }
    }

    private failure(draft: ThemeDraft, stage: Exclude<ThemePublishStage, 'idle' | 'complete'>, message: string, retryable: boolean, code = `publish_${stage === 'activation' ? 'activation' : stage}_failed`): ThemePublishResult {
        this.setState({status: 'failed', stage, targetName: this.currentAttempt?.targetName, error: message, retryable});
        return {
            ok: false,
            revision: draft.revision,
            error: {
                code,
                message,
                retryable,
                details: {stage}
            }
        };
    }

    private setState(state: ThemePublishState): void {
        this.currentState = state;
        this.listeners.forEach(listener => listener(state));
    }
}
