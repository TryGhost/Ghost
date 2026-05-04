import JSZip from 'jszip';

export type ThemeEditorFile = {
    path: string;
    editable: boolean;
    content: string | null;
    binary: Uint8Array | null;
    date: Date;
    unixPermissions: number | null;
    dosPermissions: number | null;
};

export type ThemeEditorSnapshot = {
    files: Record<string, ThemeEditorFile>;
    rootPrefix: string;
};

export const THEME_EDITOR_ARCHIVE_LIMITS = {
    maxFiles: 1000,
    maxExtractedBytes: 32 * 1024 * 1024
} as const;

export class ThemeArchiveExtractionError extends Error {
    reason: 'invalid_archive' | 'too_many_files' | 'too_large';

    constructor(reason: 'invalid_archive' | 'too_many_files' | 'too_large', message: string) {
        super(message);
        this.name = 'ThemeArchiveExtractionError';
        this.reason = reason;
    }
}

const editableExtensions = new Set([
    'css',
    'cjs',
    'hbs',
    'handlebars',
    'htm',
    'html',
    'js',
    'json',
    'less',
    'md',
    'markdown',
    'mjs',
    'sass',
    'scss',
    'svg',
    'txt',
    'xml',
    'yaml',
    'yml'
]);

const editableBasenames = new Set([
    '.editorconfig',
    '.eslintignore',
    '.eslintrc',
    '.gitattributes',
    '.gitignore',
    '.npmignore',
    '.prettierignore',
    '.prettierrc',
    'CODEOWNERS',
    'LICENSE',
    'LICENCE',
    'NOTICE',
    'Procfile'
]);

export const isEditablePath = (path: string) => {
    if (editableExtensions.has(getExtension(path))) {
        return true;
    }

    const segments = path.split('/');
    const basename = segments.at(-1) || path;

    return editableBasenames.has(basename);
};

export const getExtension = (path: string) => {
    const dotIndex = path.lastIndexOf('.');
    if (dotIndex === -1) {
        return '';
    }

    return path.slice(dotIndex + 1).toLowerCase();
};

export const normaliseRelativePath = (input: string) => {
    const cleaned = input.trim().replace(/^\/+/, '').replace(/\/+/g, '/');

    if (!cleaned) {
        return null;
    }

    const segments = cleaned.split('/').filter(Boolean);

    if (segments.length === 0) {
        return null;
    }

    if (segments.some(segment => segment === '.' || segment === '..')) {
        return null;
    }

    return segments.join('/');
};

export const isDefaultThemeName = (themeName: string) => ['casper', 'source'].includes(themeName.toLowerCase());

export const detectCommonRoot = (paths: string[]) => {
    if (paths.length === 0) {
        return '';
    }

    const firstSlash = paths[0].indexOf('/');

    if (firstSlash <= 0) {
        return '';
    }

    const prefix = paths[0].slice(0, firstSlash + 1);

    if (paths.every(path => path.startsWith(prefix))) {
        return prefix;
    }

    return '';
};

export const cloneThemeFiles = (files: Record<string, ThemeEditorFile>) => {
    return Object.fromEntries(Object.entries(files).map(([path, file]) => {
        return [path, {
            ...file,
            date: new Date(file.date),
            binary: file.binary ? new Uint8Array(file.binary) : null
        }];
    }));
};

const invalidArchiveMessage = 'Failed to open the theme archive. Download the theme again and retry.';

const getThemeArchiveSizeLabel = (bytes: number) => {
    const megabytes = bytes / (1024 * 1024);

    if (Number.isInteger(megabytes)) {
        return `${megabytes} MB`;
    }

    return `${megabytes.toFixed(1)} MB`;
};

const collectArchiveEntries = (zip: JSZip) => {
    const entries: Array<[string, JSZip.JSZipObject]> = [];

    zip.forEach((relativePath, entry) => {
        if (!entry.dir) {
            entries.push([relativePath, entry]);
        }
    });

    return entries;
};

const assertThemeArchiveLimits = (entries: Array<[string, JSZip.JSZipObject]>) => {
    if (entries.length > THEME_EDITOR_ARCHIVE_LIMITS.maxFiles) {
        throw new ThemeArchiveExtractionError(
            'too_many_files',
            `This theme archive contains too many files for the browser editor (${entries.length}/${THEME_EDITOR_ARCHIVE_LIMITS.maxFiles}).`
        );
    }
};

const loadThemeArchive = async (arrayBuffer: ArrayBuffer) => {
    try {
        return await JSZip.loadAsync(arrayBuffer);
    } catch {
        throw new ThemeArchiveExtractionError('invalid_archive', invalidArchiveMessage);
    }
};

const readThemeBinaryFile = async (entry: JSZip.JSZipObject) => {
    try {
        return await entry.async('uint8array');
    } catch {
        throw new ThemeArchiveExtractionError('invalid_archive', invalidArchiveMessage);
    }
};

const readThemeTextFile = async (entry: JSZip.JSZipObject) => {
    try {
        return await entry.async('string');
    } catch {
        throw new ThemeArchiveExtractionError('invalid_archive', invalidArchiveMessage);
    }
};

const getNormalizedArchivePath = (path: string) => {
    const normalizedPath = normaliseRelativePath(path);

    if (!normalizedPath || normalizedPath !== path) {
        throw new ThemeArchiveExtractionError('invalid_archive', invalidArchiveMessage);
    }

    return normalizedPath;
};

const trackExtractedBytes = (totalBytes: number, fileBytes: number) => {
    const nextTotal = totalBytes + fileBytes;

    if (nextTotal > THEME_EDITOR_ARCHIVE_LIMITS.maxExtractedBytes) {
        throw new ThemeArchiveExtractionError(
            'too_large',
            `This theme archive is too large to open in the browser editor. Extracted files must stay under ${getThemeArchiveSizeLabel(THEME_EDITOR_ARCHIVE_LIMITS.maxExtractedBytes)}.`
        );
    }

    return nextTotal;
};

export const extractThemeArchive = async (arrayBuffer: ArrayBuffer): Promise<ThemeEditorSnapshot> => {
    const zip = await loadThemeArchive(arrayBuffer);
    const entries = collectArchiveEntries(zip);

    assertThemeArchiveLimits(entries);

    const rootPrefix = detectCommonRoot(entries.map(([path]) => path));
    const files: Record<string, ThemeEditorFile> = {};
    const textEncoder = new TextEncoder();
    let extractedBytes = 0;

    for (const [zipPath, entry] of entries) {
        const displayPath = rootPrefix ? zipPath.slice(rootPrefix.length) : zipPath;

        if (!displayPath) {
            continue;
        }

        const normalizedPath = getNormalizedArchivePath(displayPath);
        const editable = isEditablePath(normalizedPath);

        if (editable) {
            try {
                const content = await readThemeTextFile(entry);
                extractedBytes = trackExtractedBytes(extractedBytes, textEncoder.encode(content).byteLength);

                files[normalizedPath] = {
                    path: normalizedPath,
                    editable: true,
                    content,
                    binary: null,
                    date: entry.date || new Date(),
                    unixPermissions: typeof entry.unixPermissions === 'number' ? entry.unixPermissions : null,
                    dosPermissions: typeof entry.dosPermissions === 'number' ? entry.dosPermissions : null
                };
                continue;
            } catch {
                // Fall back to binary handling below.
            }
        }

        const binary = await readThemeBinaryFile(entry);
        extractedBytes = trackExtractedBytes(extractedBytes, binary.byteLength);

        files[normalizedPath] = {
            path: normalizedPath,
            editable: false,
            content: null,
            binary,
            date: entry.date || new Date(),
            unixPermissions: typeof entry.unixPermissions === 'number' ? entry.unixPermissions : null,
            dosPermissions: typeof entry.dosPermissions === 'number' ? entry.dosPermissions : null
        };
    }

    return {files, rootPrefix};
};

export const packThemeArchive = async ({files, rootPrefix}: ThemeEditorSnapshot) => {
    const zip = new JSZip();

    for (const [path, file] of Object.entries(files)) {
        const zipPath = `${rootPrefix}${path}`;
        const options = {
            date: file.date,
            createFolders: true,
            unixPermissions: file.unixPermissions ?? undefined,
            dosPermissions: file.dosPermissions ?? undefined
        };

        if (file.editable) {
            zip.file(zipPath, file.content ?? '', options);
        } else {
            zip.file(zipPath, file.binary!, {
                ...options,
                binary: true
            });
        }
    }

    return zip.generateAsync({
        type: 'blob',
        mimeType: 'application/zip',
        compression: 'DEFLATE',
        compressionOptions: {level: 6}
    });
};

export type ThemeChange = {
    path: string;
    editable: boolean;
    status: 'added' | 'deleted' | 'modified';
};

export const getThemeChanges = ({baseFiles, currentFiles}: {
    baseFiles: Record<string, ThemeEditorFile>;
    currentFiles: Record<string, ThemeEditorFile>;
}) => {
    const allPaths = new Set([...Object.keys(baseFiles), ...Object.keys(currentFiles)]);
    const changes: ThemeChange[] = [];

    for (const path of Array.from(allPaths).sort()) {
        const baseFile = baseFiles[path];
        const currentFile = currentFiles[path];

        if (!baseFile && currentFile) {
            changes.push({
                path,
                editable: currentFile.editable,
                status: 'added'
            });
            continue;
        }

        if (baseFile && !currentFile) {
            changes.push({
                path,
                editable: baseFile.editable,
                status: 'deleted'
            });
            continue;
        }

        if (!baseFile || !currentFile) {
            continue;
        }

        if (baseFile.editable && currentFile.editable && baseFile.content !== currentFile.content) {
            changes.push({
                path,
                editable: true,
                status: 'modified'
            });
        }
    }

    return changes;
};

export const createFolderRenameMap = ({
    files,
    oldPrefix,
    newPrefix
}: {
    files: Record<string, ThemeEditorFile>;
    oldPrefix: string;
    newPrefix: string;
}) => {
    const updates: Record<string, ThemeEditorFile> = {};

    for (const [path, file] of Object.entries(files)) {
        if (!path.startsWith(oldPrefix)) {
            updates[path] = file;
            continue;
        }

        const updatedPath = `${newPrefix}${path.slice(oldPrefix.length)}`;
        updates[updatedPath] = {
            ...file,
            path: updatedPath
        };
    }

    return updates;
};
