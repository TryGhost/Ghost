import type {BuilderSelectionContext} from '@/builder/core/workspace';

export type ThemeFile = {
    path: string;
    kind: 'text' | 'binary';
    content: string | null;
    binary: Uint8Array | null;
    unixPermissions: number | null;
    dosPermissions: number | null;
};

export type ThemeGlobalSettings = {
    accent_color: string | null;
    heading_font: string | null;
    body_font: string | null;
    icon: string | null;
    logo: string | null;
    cover_image: string | null;
};

type ThemeCustomSettingBase = {
    id: string;
    key: string;
    description?: string;
    group?: string;
    visibility?: string;
};

export type ThemeCustomSetting = ThemeCustomSettingBase & (
    | {type: 'text'; value: string | null; default: string | null}
    | {type: 'color'; value: string; default: string}
    | {type: 'image'; value: string | null}
    | {type: 'boolean'; value: boolean; default: boolean}
    | {type: 'select'; value: string; default: string; options: string[]}
);

export type ThemeDraft = {
    revision: string;
    theme: {
        name: string;
        version: string;
        builtIn: boolean;
        rootPrefix: string;
    };
    files: Record<string, ThemeFile>;
    globalSettings: ThemeGlobalSettings;
    customSettings: Record<string, ThemeCustomSetting>;
    renderer: {
        siteUrl: string;
        contentApiKey: string;
        config: Record<string, unknown>;
        missing: string[];
    };
    virtualUrl: string;
    selection: BuilderSelectionContext | null;
};

function stableValue(value: unknown): unknown {
    if (Array.isArray(value)) {
        return value.map(stableValue);
    }
    if (value && typeof value === 'object') {
        return Object.fromEntries(Object.entries(value).sort(([left], [right]) => left < right ? -1 : left > right ? 1 : 0).flatMap(([key, item]) => item === undefined ? [] : [[key, stableValue(item)]]));
    }
    return value;
}

function revisionMetadata(draft: ThemeDraft): Record<string, unknown> {
    return {
        theme: draft.theme,
        files: Object.fromEntries(Object.keys(draft.files).sort().map((path) => {
            const file = draft.files[path];
            return [path, {
                path: file.path,
                kind: file.kind,
                content: file.content,
                binaryLength: file.binary?.byteLength ?? null,
                unixPermissions: file.unixPermissions,
                dosPermissions: file.dosPermissions
            }];
        })),
        globalSettings: draft.globalSettings,
        customSettings: draft.customSettings,
        renderer: draft.renderer,
        virtualUrl: draft.virtualUrl,
        selection: draft.selection
    };
}

function publishMetadata(draft: ThemeDraft): unknown {
    return Object.fromEntries(Object.entries(revisionMetadata(draft)).filter(([key]) => !['renderer', 'selection', 'virtualUrl'].includes(key)));
}

function framedText(value: string): Uint8Array {
    return new TextEncoder().encode(`${value.length}:${value}`);
}

async function hashThemeDraft(draft: ThemeDraft, metadata: unknown, prefix: string): Promise<string> {
    const chunks = [framedText(JSON.stringify(stableValue(metadata)))];
    for (const path of Object.keys(draft.files).sort()) {
        const binary = draft.files[path].binary;
        if (binary) {
            chunks.push(framedText(path), framedText(String(binary.byteLength)), binary);
        }
    }
    const byteLength = chunks.reduce((total, chunk) => total + chunk.byteLength, 0);
    const bytes = new Uint8Array(byteLength);
    let offset = 0;
    for (const chunk of chunks) {
        bytes.set(chunk, offset);
        offset += chunk.byteLength;
    }
    const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes);
    const hex = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
    return `${prefix}-${hex}`;
}

async function themeRevision(draft: ThemeDraft): Promise<string> {
    return hashThemeDraft(draft, revisionMetadata(draft), 'theme');
}

export function cloneThemeDraft(draft: ThemeDraft): ThemeDraft {
    return structuredClone(draft);
}

export async function withThemeRevision(draft: ThemeDraft): Promise<ThemeDraft> {
    const next = cloneThemeDraft(draft);
    next.revision = await themeRevision(next);
    return next;
}

export function themePublishRevision(draft: ThemeDraft): Promise<string> {
    return hashThemeDraft(draft, publishMetadata(draft), 'theme-publish');
}
