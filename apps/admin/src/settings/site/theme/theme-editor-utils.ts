/**
 * Theme code editor utilities.
 *
 * The browser zip round-trip (extract/pack + limits + text/binary
 * classification) moved to `@tryghost/theme-renderer/editor/archive` so the
 * on-site edit mode (admin-toolbar edit-mode chunk) shares the exact same
 * archive behavior — it is re-exported here unchanged for the editor UI.
 * What remains below is Admin-app-specific: routing, save-as rules, and the
 * file-tree diff/rename helpers.
 */
export {
    THEME_EDITOR_ARCHIVE_LIMITS,
    ThemeArchiveExtractionError,
    cloneThemeFiles,
    detectCommonRoot,
    extractThemeArchive,
    getExtension,
    isDefaultThemeName,
    isEditablePath,
    normaliseRelativePath,
    packThemeArchive
} from '@tryghost/theme-renderer/editor/archive';
export type {ThemeEditorFile, ThemeEditorSnapshot} from '@tryghost/theme-renderer/editor/archive';

import type {ThemeEditorFile} from '@tryghost/theme-renderer/editor/archive';

export const parseEditingThemeRoute = (path: string): {themeName: string | null; isInvalid: boolean} => {
    if (!path.startsWith('theme/edit/')) {
        return {themeName: null, isInvalid: false};
    }

    const encodedThemeName = path.slice('theme/edit/'.length).split('?')[0];
    if (!encodedThemeName || encodedThemeName.includes('/')) {
        return {themeName: null, isInvalid: true};
    }

    try {
        const themeName = decodeURIComponent(encodedThemeName);
        return !themeName || themeName.includes('/')
            ? {themeName: null, isInvalid: true}
            : {themeName, isInvalid: false};
    } catch {
        return {themeName: null, isInvalid: true};
    }
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
