import {
    THEME_EDITOR_ARCHIVE_LIMITS,
    ThemeArchiveExtractionError,
    detectCommonRoot,
    extractThemeArchive,
    normaliseRelativePath
} from '@tryghost/theme-renderer/editor/archive';
import {scrapeInstanceConfig} from '@tryghost/theme-renderer/editor/instance-config';
import type {CustomThemeSetting as AdminCustomThemeSetting} from '@tryghost/admin-x-framework/api/custom-theme-settings';
import JSZip from 'jszip';

import {isCustomThemeSettingVisible} from '@/settings/app/utils/is-custom-theme-settings-visible';

import {withThemeRevision} from './theme-state';

import type {BuilderSelectionContext} from '@/builder/core/workspace';
import type {ThemeCustomSetting, ThemeDraft, ThemeFile, ThemeGlobalSettings} from './theme-state';

type SettingValue = string | boolean | null;

export type ThemeLoadCustomSetting = AdminCustomThemeSetting;

export type ThemeLoadInput = {
    theme: {name: string; builtIn: boolean};
    archive: ArrayBuffer;
    settings: Array<{key: string; value: SettingValue}>;
    customSettings: ThemeLoadCustomSetting[];
    site: {url: string; contentApiKey: string; liveHtml: string};
    virtualUrl?: string;
    selection?: BuilderSelectionContext | null;
};

type ThemeLoadErrorCode = 'invalid_archive' | 'archive_limit' | 'unsafe_path' | 'duplicate_path' | 'unsupported_encoding' | 'missing_metadata' | 'invalid_metadata';

export class ThemeLoadError extends Error {
    readonly code: ThemeLoadErrorCode;

    constructor(code: ThemeLoadErrorCode, message: string) {
        super(message);
        this.name = 'ThemeLoadError';
        this.code = code;
    }
}

function abortIfNeeded(signal?: AbortSignal): void {
    if (signal?.aborted) {
        throw new DOMException('Aborted', 'AbortError');
    }
}

function findEndOfCentralDirectory(bytes: Uint8Array): number {
    const minimumOffset = Math.max(0, bytes.byteLength - 65_557);
    for (let offset = bytes.byteLength - 22; offset >= minimumOffset; offset -= 1) {
        if (bytes[offset] === 0x50 && bytes[offset + 1] === 0x4B && bytes[offset + 2] === 0x05 && bytes[offset + 3] === 0x06) {
            return offset;
        }
    }
    throw new ThemeLoadError('invalid_archive', 'Failed to read the theme archive directory.');
}

type ArchiveEntry = {
    rawPath: string;
    effectivePath: string;
    uncompressedSize: number;
};

const crc32Table = new Uint32Array(256).map((_, index) => {
    let value = index;
    for (let bit = 0; bit < 8; bit += 1) {
        value = (value & 1) === 1 ? 0xEDB88320 ^ (value >>> 1) : value >>> 1;
    }
    return value >>> 0;
});

function crc32(bytes: Uint8Array): number {
    let value = 0xFFFFFFFF;
    for (const byte of bytes) {
        value = crc32Table[(value ^ byte) & 0xFF] ^ (value >>> 8);
    }
    return (value ^ 0xFFFFFFFF) >>> 0;
}

function unicodePath(extra: Uint8Array, rawPath: Uint8Array, decoder: TextDecoder): string | null {
    const view = new DataView(extra.buffer, extra.byteOffset, extra.byteLength);
    let offset = 0;
    let path: string | null = null;
    let foundPathField = false;
    while (offset < extra.byteLength) {
        if (offset + 4 > extra.byteLength) {
            throw new ThemeLoadError('invalid_archive', 'Failed to read the theme archive path metadata.');
        }
        const id = view.getUint16(offset, true);
        const length = view.getUint16(offset + 2, true);
        const valueOffset = offset + 4;
        if (valueOffset + length > extra.byteLength) {
            throw new ThemeLoadError('invalid_archive', 'Failed to read the theme archive path metadata.');
        }
        if (id === 0x7075) {
            if (foundPathField) {
                throw new ThemeLoadError('invalid_archive', 'Theme archive entries must not contain duplicate Unicode path metadata.');
            }
            foundPathField = true;
            if (length >= 5 && extra[valueOffset] === 1 && view.getUint32(valueOffset + 1, true) === crc32(rawPath)) {
                try {
                    path = decoder.decode(extra.subarray(valueOffset + 5, valueOffset + length));
                } catch {
                    throw new ThemeLoadError('unsupported_encoding', 'Theme archive paths must use UTF-8 encoding.');
                }
            }
        }
        offset = valueOffset + length;
    }
    return path;
}

function archiveEntries(archive: ArrayBuffer): ArchiveEntry[] {
    const bytes = new Uint8Array(archive);
    const view = new DataView(archive);
    const endOffset = findEndOfCentralDirectory(bytes);
    const entryCount = view.getUint16(endOffset + 10, true);
    let offset = view.getUint32(endOffset + 16, true);
    const entries: ArchiveEntry[] = [];
    const decoder = new TextDecoder('utf-8', {fatal: true});

    for (let index = 0; index < entryCount; index += 1) {
        if (offset + 46 > bytes.byteLength || view.getUint32(offset, true) !== 0x02014B50) {
            throw new ThemeLoadError('invalid_archive', 'Failed to read the theme archive directory.');
        }
        const nameLength = view.getUint16(offset + 28, true);
        const extraLength = view.getUint16(offset + 30, true);
        const commentLength = view.getUint16(offset + 32, true);
        const entryEnd = offset + 46 + nameLength + extraLength + commentLength;
        if (entryEnd > bytes.byteLength) {
            throw new ThemeLoadError('invalid_archive', 'Failed to read the theme archive directory.');
        }
        const rawPathBytes = bytes.subarray(offset + 46, offset + 46 + nameLength);
        const extra = bytes.subarray(offset + 46 + nameLength, offset + 46 + nameLength + extraLength);
        let rawPath;
        try {
            rawPath = decoder.decode(rawPathBytes);
        } catch {
            throw new ThemeLoadError('unsupported_encoding', 'Theme archive paths must use UTF-8 encoding.');
        }
        entries.push({
            rawPath,
            effectivePath: unicodePath(extra, rawPathBytes, decoder) ?? rawPath,
            uncompressedSize: view.getUint32(offset + 24, true)
        });
        offset = entryEnd;
    }
    return entries;
}

function validatePaths(paths: string[]): void {
    const rootPrefix = detectCommonRoot(paths);
    const normalizedPaths = new Set<string>();

    for (const path of paths) {
        const normalizedArchivePath = normaliseRelativePath(path);
        if (!normalizedArchivePath || normalizedArchivePath !== path || path.includes('\\') || path.includes('\0') || /^[A-Za-z]:\//.test(path)) {
            throw new ThemeLoadError('unsafe_path', `Unsafe theme archive path: ${path}`);
        }
        const displayPath = rootPrefix ? path.slice(rootPrefix.length) : path;
        const normalized = normaliseRelativePath(displayPath);
        if (!normalized || normalized !== displayPath) {
            throw new ThemeLoadError('unsafe_path', `Unsafe theme archive path: ${displayPath || path}`);
        }
        if (normalizedPaths.has(normalized)) {
            throw new ThemeLoadError('duplicate_path', `Duplicate theme archive path: ${normalized}`);
        }
        normalizedPaths.add(normalized);
    }
}

function validateArchivePaths(themeArchive: ArrayBuffer): void {
    const entries = archiveEntries(themeArchive);
    const files = entries.filter(entry => !entry.effectivePath.endsWith('/'));
    validatePaths(files.map(entry => entry.rawPath));
    validatePaths(files.map(entry => entry.effectivePath));

    if (files.length > THEME_EDITOR_ARCHIVE_LIMITS.maxFiles) {
        throw new ThemeLoadError('archive_limit', `This theme archive contains too many files for the browser editor (${files.length}/${THEME_EDITOR_ARCHIVE_LIMITS.maxFiles}).`);
    }
    const declaredBytes = files.reduce((total, entry) => total + entry.uncompressedSize, 0);
    if (declaredBytes > THEME_EDITOR_ARCHIVE_LIMITS.maxExtractedBytes) {
        throw new ThemeLoadError('archive_limit', 'This theme archive is too large to open in the browser editor.');
    }
}

type StreamableZipEntry = JSZip.JSZipObject & {
    internalStream(type: 'uint8array'): JSZip.JSZipStreamHelper<Uint8Array>;
};

function streamedEntrySize(entry: JSZip.JSZipObject, remainingBytes: number, signal?: AbortSignal): Promise<number> {
    return new Promise((resolve, reject) => {
        const stream = (entry as StreamableZipEntry).internalStream('uint8array');
        let byteLength = 0;
        let settled = false;
        const stop = (error: Error) => {
            if (!settled) {
                settled = true;
                stream.pause();
                reject(error);
            }
        };
        stream.on('data', (chunk) => {
            if (signal?.aborted) {
                stop(new DOMException('Aborted', 'AbortError'));
                return;
            }
            byteLength += chunk.byteLength;
            if (byteLength > remainingBytes) {
                stop(new ThemeLoadError('archive_limit', 'This theme archive is too large to open in the browser editor.'));
            }
        });
        stream.on('error', stop);
        stream.on('end', () => {
            if (!settled) {
                settled = true;
                resolve(byteLength);
            }
        });
        stream.resume();
    });
}

async function validateInflatedSize(themeArchive: ArrayBuffer, signal?: AbortSignal): Promise<void> {
    let zip: JSZip;
    try {
        zip = await JSZip.loadAsync(themeArchive);
    } catch {
        throw new ThemeLoadError('invalid_archive', 'Failed to open the theme archive.');
    }
    let extractedBytes = 0;
    try {
        for (const entry of Object.values(zip.files)) {
            abortIfNeeded(signal);
            if (!entry.dir) {
                extractedBytes += await streamedEntrySize(entry, THEME_EDITOR_ARCHIVE_LIMITS.maxExtractedBytes - extractedBytes, signal);
            }
        }
    } catch (error) {
        if (error instanceof ThemeLoadError || (error instanceof DOMException && error.name === 'AbortError')) {
            throw error;
        }
        throw new ThemeLoadError('invalid_archive', 'Failed to read the theme archive contents.');
    }
}

function extractedFiles(files: Awaited<ReturnType<typeof extractThemeArchive>>['files']): Record<string, ThemeFile> {
    return Object.fromEntries(Object.entries(files).map(([path, file]) => {
        if (file.editable && file.content?.includes('\uFFFD')) {
            throw new ThemeLoadError('unsupported_encoding', `Theme text file is not valid UTF-8: ${path}`);
        }
        return [path, {
            path,
            kind: file.editable ? 'text' : 'binary',
            content: file.content,
            binary: file.binary ? new Uint8Array(file.binary) : null,
            unixPermissions: file.unixPermissions,
            dosPermissions: file.dosPermissions
        } satisfies ThemeFile];
    }));
}

function packageMetadata(files: Record<string, ThemeFile>): {name: string; version: string} {
    const packageFile = files['package.json'];
    if (!packageFile || packageFile.kind !== 'text' || packageFile.content === null) {
        throw new ThemeLoadError('missing_metadata', 'The theme archive does not contain package.json metadata.');
    }
    try {
        const metadata = JSON.parse(packageFile.content) as {name?: unknown; version?: unknown};
        if (typeof metadata.name !== 'string' || !metadata.name.trim()) {
            throw new Error('Missing theme name');
        }
        return {
            name: metadata.name,
            version: typeof metadata.version === 'string' && metadata.version ? metadata.version : '0.0.0'
        };
    } catch {
        throw new ThemeLoadError('invalid_metadata', 'The theme package.json metadata is invalid.');
    }
}

function settingValue(settings: ThemeLoadInput['settings'], key: string): string | null {
    const value = settings.find(setting => setting.key === key)?.value;
    return typeof value === 'string' ? value : null;
}

function globalSettings(settings: ThemeLoadInput['settings']): ThemeGlobalSettings {
    return {
        accent_color: settingValue(settings, 'accent_color'),
        heading_font: settingValue(settings, 'heading_font'),
        body_font: settingValue(settings, 'body_font'),
        icon: settingValue(settings, 'icon'),
        logo: settingValue(settings, 'logo'),
        cover_image: settingValue(settings, 'cover_image')
    };
}

function customSettings(settings: ThemeLoadCustomSetting[]): Record<string, ThemeCustomSetting> {
    return Object.fromEntries(settings.map(setting => [setting.key, structuredClone(setting)]));
}

export function visibleThemeCustomSettings(settings: Record<string, ThemeCustomSetting>): Record<string, ThemeCustomSetting> {
    const definitions = Object.values(settings);
    const values = Object.fromEntries(definitions.map(setting => [setting.key, setting.value])) as unknown as Record<string, string>;
    return Object.fromEntries(definitions.filter(setting => isCustomThemeSettingVisible(setting, values)).map(setting => [setting.key, structuredClone(setting)]));
}

export async function loadThemeDraft(input: ThemeLoadInput, signal?: AbortSignal): Promise<ThemeDraft> {
    abortIfNeeded(signal);
    validateArchivePaths(input.archive);
    await validateInflatedSize(input.archive, signal);
    let extracted;
    try {
        extracted = await extractThemeArchive(input.archive);
    } catch (error) {
        if (error instanceof ThemeLoadError) {
            throw error;
        }
        if (error instanceof ThemeArchiveExtractionError) {
            const code = error.reason === 'too_large' || error.reason === 'too_many_files' ? 'archive_limit' : 'invalid_archive';
            throw new ThemeLoadError(code, error.message);
        }
        throw error;
    }
    abortIfNeeded(signal);
    const files = extractedFiles(extracted.files);
    const metadata = packageMetadata(files);
    const instanceConfig = scrapeInstanceConfig(input.site.liveHtml);
    const draft: ThemeDraft = {
        revision: '',
        theme: {
            name: input.theme.name || metadata.name,
            version: metadata.version,
            builtIn: input.theme.builtIn,
            rootPrefix: extracted.rootPrefix
        },
        files,
        globalSettings: globalSettings(input.settings),
        customSettings: customSettings(input.customSettings),
        renderer: {
            siteUrl: input.site.url,
            contentApiKey: input.site.contentApiKey,
            config: instanceConfig.config,
            missing: instanceConfig.missing
        },
        virtualUrl: input.virtualUrl ?? input.site.url,
        selection: input.selection ? structuredClone(input.selection) : null
    };
    return withThemeRevision(draft);
}
