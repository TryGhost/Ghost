import CodeMirror, {EditorView} from '@uiw/react-codemirror';
import InvalidThemeModal, {type FatalErrors} from './invalid-theme-modal';
import NiceModal, {useModal} from '@ebay/nice-modal-react';
import React, {useEffect, useMemo, useRef, useState} from 'react';
import ThemeEditorConfirmModal from './theme-editor-confirm-modal';
import ThemeEditorInputModal from './theme-editor-input-modal';
import ThemeEditorToolbar from './theme-editor-toolbar';
import ThemeFileTree from './theme-file-tree';
import ThemeInstalledModal from './theme-installed-modal';
import ThemeReviewModal, {buildReviewItems} from './theme-review-modal';
import {TextWrap, Undo2} from 'lucide-react';
import {
    cloneThemeFiles,
    createFolderRenameMap,
    extractThemeArchive,
    getExtension,
    getThemeChanges,
    isDefaultThemeName,
    isEditablePath,
    normaliseRelativePath,
    packThemeArchive
} from './theme-editor-utils';
import {getGhostPaths} from '@tryghost/admin-x-framework/helpers';
import {oneDark} from '@codemirror/theme-one-dark';
import {search} from '@codemirror/search';
import {showToast} from '@tryghost/admin-x-design-system';
import {useBrowseThemes} from '@tryghost/admin-x-framework/api/themes';
import {useHandleError} from '@tryghost/admin-x-framework/hooks';
import {useQueryClient} from '@tanstack/react-query';
import {useRouting} from '@tryghost/admin-x-framework/routing';
import type {SelectedNode} from './theme-file-tree';
import type {ThemeEditorConfirmModalProps} from './theme-editor-confirm-modal';
import type {ThemeEditorFile} from './theme-editor-utils';
import type {ThemeEditorInputModalProps} from './theme-editor-input-modal';
import type {ThemesInstallResponseType} from '@tryghost/admin-x-framework/api/themes';

const getLanguageExtension = (path: string) => {
    const extension = getExtension(path);

    switch (extension) {
    case 'css':
    case 'scss':
    case 'sass':
    case 'less':
        return import('@codemirror/lang-css').then(module => module.css());
    case 'js':
    case 'cjs':
    case 'mjs':
        return import('@codemirror/lang-javascript').then(module => module.javascript());
    case 'json':
        return import('@codemirror/lang-json').then(module => module.json());
    case 'md':
    case 'markdown':
        return import('@codemirror/lang-markdown').then(module => module.markdown());
    case 'yaml':
    case 'yml':
        return import('@codemirror/lang-yaml').then(module => module.yaml());
    case 'hbs':
    case 'handlebars':
    case 'html':
    case 'htm':
    case 'svg':
    case 'xml':
        return import('@codemirror/lang-html').then(module => module.html());
    default:
        return import('@codemirror/lang-html').then(module => module.html());
    }
};

const getLanguageLabel = (path: string) => {
    const extension = getExtension(path);

    if (!extension) {
        return 'text';
    }

    switch (extension) {
    case 'hbs':
        return 'handlebars';
    case 'htm':
        return 'html';
    case 'yml':
        return 'yaml';
    default:
        return extension;
    }
};

const getDefaultSelection = (files: Record<string, ThemeEditorFile>): SelectedNode => {
    if (files['package.json']?.editable) {
        return {type: 'file', path: 'package.json'};
    }

    const nextEditable = Object.keys(files).sort().find(path => files[path].editable);

    if (nextEditable) {
        return {type: 'file', path: nextEditable};
    }

    const firstPath = Object.keys(files).sort()[0];

    return firstPath ? {type: 'file', path: firstPath} : null;
};

const getParentDirectories = (path: string) => {
    const segments = path.split('/');
    const directories: string[] = [''];

    for (let index = 0; index < segments.length - 1; index += 1) {
        directories.push(`${segments.slice(0, index + 1).join('/')}/`);
    }

    return directories;
};

const ALLOWED_RETURN_ROUTE_PREFIXES = ['theme', 'design'];

const isAllowedReturnRoute = (route: string): boolean => {
    return ALLOWED_RETURN_ROUTE_PREFIXES.some(prefix => route === prefix || route.startsWith(`${prefix}/`));
};

const getReturnRouteFromHash = () => {
    const hash = window.location.hash.substring(1);
    const domain = `${window.location.protocol}//${window.location.hostname}`;

    let url: URL;
    try {
        url = new URL(hash || '/', domain);
    } catch {
        return null;
    }

    const from = url.searchParams.get('from');

    if (from === null) {
        return null;
    }

    if (from === '' || isAllowedReturnRoute(from)) {
        return from;
    }

    return null;
};

const buildThemeEditorRoute = (themeName: string, fromRoute: string | null) => {
    const nextRoute = `theme/edit/${encodeURIComponent(themeName)}`;

    if (fromRoute === null) {
        return nextRoute;
    }

    return `${nextRoute}?from=${encodeURIComponent(fromRoute)}`;
};

const wouldRenameBinaryFileToEditable = (file: ThemeEditorFile, nextPath: string) => {
    return !file.editable && isEditablePath(nextPath);
};

// Positive allowlist for theme names typed into the "Save as" flow.
// The server (BaseStorage.getSanitizedFileName) silently replaces any
// non [\w@.] characters with a dash, so the file ends up persisted under
// a name that may not match what the user typed. Failing fast on the
// client gives a clear error instead of a surprising rename.
//
// Rules (input is already lower-cased before the test):
//  - 1-64 characters total
//  - first character must be a letter or digit (no leading dash /
//    underscore, avoiding hidden-file conventions and Unicode oddities)
//  - remaining characters: word chars or dashes only
//
// Dots are deliberately excluded: real Ghost themes are kebab-case and
// have no legitimate use for dots, while allowing them invites extension
// confusion (`mytheme.zip` saved as a theme name) and trailing-dot
// stripping on Windows when the archive is later unzipped.
const THEME_NAME_PATTERN = /^[a-z0-9][\w-]{0,63}$/;

type UploadSizeLimitError = {
    message?: string;
    code?: string;
    errorDetails?: {
        entryName?: string;
        observedBytes?: number;
        limitBytes?: number;
    };
};

const UPLOAD_SIZE_LIMIT_TITLES: Record<string, string> = {
    COMPRESSED_TOO_LARGE: 'Theme too large to upload',
    ENTRY_TOO_LARGE: 'File too large',
    TOTAL_TOO_LARGE: 'Theme contents too large'
};

const formatLimitBytes = (bytes: number | undefined) => {
    if (!bytes || bytes <= 0) {
        return 'the allowed size';
    }
    const mb = bytes / (1024 * 1024);
    if (mb >= 1) {
        return `${mb.toFixed(1)} MB`;
    }
    return `${Math.round(bytes / 1024)} KB`;
};

const buildUploadSizeLimitMessage = (err: UploadSizeLimitError) => {
    const {entryName, limitBytes} = err.errorDetails ?? {};
    const limit = formatLimitBytes(limitBytes);

    switch (err.code) {
    case 'COMPRESSED_TOO_LARGE':
        return `The theme archive is too large to upload (max ${limit}).`;
    case 'ENTRY_TOO_LARGE':
        return entryName
            ? `The file "${entryName}" is too large (max ${limit} per file).`
            : `One of the files is too large (max ${limit} per file).`;
    case 'TOTAL_TOO_LARGE':
        return `The theme contents exceed the maximum allowed size of ${limit}.`;
    default:
        return err.message || 'Theme upload failed.';
    }
};

const wrapToggleClass = (active: boolean) => `inline-flex h-5 w-5 items-center justify-center rounded-sm text-[#c8ccd3] transition-opacity hover:opacity-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4a9eff] ${active ? 'opacity-100' : 'opacity-60'}`;

const editorPaneEmptyStateClass = 'flex h-full items-center justify-center p-8 text-center text-[13px] text-[#6a6f78]';

const editorSelectionTheme = EditorView.theme({
    '&.cm-focused > .cm-scroller > .cm-selectionLayer .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection': {
        backgroundColor: '#355070'
    },
    '.cm-content ::selection': {
        color: '#ffffff'
    }
}, {dark: true});

const ThemeCodeEditorModal: React.FC<{themeName: string}> = ({themeName}) => {
    const modal = useModal();
    const {updateRoute} = useRouting();
    const queryClient = useQueryClient();
    const handleError = useHandleError();
    const {data: themesData} = useBrowseThemes();

    const [currentThemeName, setCurrentThemeName] = useState(themeName);
    const [baseFiles, setBaseFiles] = useState<Record<string, ThemeEditorFile>>({});
    const [currentFiles, setCurrentFiles] = useState<Record<string, ThemeEditorFile>>({});
    const [rootPrefix, setRootPrefix] = useState('');
    const [selectedNode, setSelectedNode] = useState<SelectedNode>(null);
    const [expandedDirectories, setExpandedDirectories] = useState<Set<string>>(new Set(['']));
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [isReviewOpen, setIsReviewOpen] = useState(false);
    const [isTextWrapEnabled, setIsTextWrapEnabled] = useState(false);
    const [editorExtensions, setEditorExtensions] = useState<Array<ReturnType<typeof search> | typeof oneDark | typeof editorSelectionTheme | typeof EditorView.lineWrapping | Awaited<ReturnType<typeof getLanguageExtension>>>>([]);

    useEffect(() => {
        let isMounted = true;

        const resetLoadedTheme = () => {
            setCurrentThemeName(themeName);
            setBaseFiles({});
            setCurrentFiles({});
            setRootPrefix('');
            setSelectedNode(null);
            setExpandedDirectories(new Set(['']));
        };

        const loadTheme = async () => {
            setIsLoading(true);
            setLoadError(null);
            resetLoadedTheme();

            try {
                const {apiRoot} = getGhostPaths();
                const response = await fetch(`${apiRoot}/themes/${encodeURIComponent(themeName)}/download/`, {
                    credentials: 'include',
                    headers: {
                        Accept: 'application/zip, application/octet-stream, */*'
                    }
                });

                if (!response.ok) {
                    throw new Error(`Failed to load theme "${themeName}" (${response.status})`);
                }

                const archive = await response.arrayBuffer();
                const snapshot = await extractThemeArchive(archive);
                const nextFiles = cloneThemeFiles(snapshot.files);
                const nextSelection = getDefaultSelection(nextFiles);

                if (!isMounted) {
                    return;
                }

                setCurrentThemeName(themeName);
                setBaseFiles(cloneThemeFiles(snapshot.files));
                setCurrentFiles(nextFiles);
                setRootPrefix(snapshot.rootPrefix);
                setSelectedNode(nextSelection);
                setExpandedDirectories(new Set(nextSelection?.type === 'file' ? getParentDirectories(nextSelection.path) : ['']));
            } catch (error) {
                if (!isMounted) {
                    return;
                }

                setLoadError(error instanceof Error ? error.message : 'Failed to load theme');
            } finally {
                if (isMounted) {
                    setIsLoading(false);
                }
            }
        };

        loadTheme();

        return () => {
            isMounted = false;
        };
    }, [themeName]);

    useEffect(() => {
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';

        return () => {
            document.body.style.overflow = previousOverflow;
        };
    }, []);

    const changes = useMemo(() => getThemeChanges({baseFiles, currentFiles}), [baseFiles, currentFiles]);
    const changesMap = useMemo(() => new Map(changes.map(change => [change.path, change.status])), [changes]);
    const reviewItems = useMemo(() => buildReviewItems({baseFiles, currentFiles, changes}), [baseFiles, currentFiles, changes]);
    const selectedFile = selectedNode?.type === 'file' ? currentFiles[selectedNode.path] : null;

    useEffect(() => {
        let isMounted = true;

        if (!selectedFile?.editable) {
            setEditorExtensions([]);
            return () => {
                isMounted = false;
            };
        }

        // Only the language extension is async (dynamic import); oneDark and
        // the other extensions are static. Awaiting just the language load
        // keeps the Promise types honest and makes the fallback branch read
        // more clearly.
        getLanguageExtension(selectedFile.path).then((languageExtension) => {
            if (isMounted) {
                setEditorExtensions([
                    search({top: true}),
                    oneDark,
                    languageExtension,
                    ...(isTextWrapEnabled ? [EditorView.lineWrapping] : []),
                    editorSelectionTheme
                ]);
            }
        }).catch(() => {
            if (isMounted) {
                setEditorExtensions([
                    search({top: true}),
                    oneDark,
                    ...(isTextWrapEnabled ? [EditorView.lineWrapping] : []),
                    editorSelectionTheme
                ]);
            }
        });

        return () => {
            isMounted = false;
        };
    }, [isTextWrapEnabled, selectedFile]);

    const requestConfirmation = async ({
        title,
        prompt,
        cancelLabel,
        okLabel,
        okColor
    }: ThemeEditorConfirmModalProps) => {
        const confirmed = await NiceModal.show(ThemeEditorConfirmModal, {
            title,
            prompt,
            cancelLabel,
            okLabel,
            okColor
        }) as boolean | undefined;

        return Boolean(confirmed);
    };

    const requestInput = async ({
        title,
        prompt,
        fieldTitle,
        initialValue,
        placeholder,
        cancelLabel,
        okLabel
    }: ThemeEditorInputModalProps) => {
        return await NiceModal.show(ThemeEditorInputModal, {
            title,
            prompt,
            fieldTitle,
            initialValue,
            placeholder,
            cancelLabel,
            okLabel
        }) as string | null;
    };

    const closeEditor = async () => {
        if (changes.length > 0) {
            const shouldDiscard = await requestConfirmation({
                title: 'Discard changes?',
                prompt: 'You have unsaved theme changes. Close the editor and discard them?',
                okLabel: 'Discard changes',
                okColor: 'red'
            });

            if (!shouldDiscard) {
                return;
            }
        }

        modal.remove();
        updateRoute(getReturnRouteFromHash() ?? 'design/change-theme');
    };

    // Keep a ref to the latest handleSave so the keydown listener can call
    // the freshest version without re-registering on every render. handleSave
    // captures state (currentFiles, changes, isSaving, ...) and is recreated
    // each render — using a ref decouples that churn from the global listener.
    const handleSaveRef = useRef<() => void>(() => {});

    useEffect(() => {
        const handleKeydown = (event: KeyboardEvent) => {
            if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's') {
                event.preventDefault();
                void handleSaveRef.current();
                return;
            }

            if (event.key !== 'Escape') {
                return;
            }

            event.preventDefault();
            event.stopPropagation();
            event.stopImmediatePropagation();
        };

        window.addEventListener('keydown', handleKeydown, true);

        return () => {
            window.removeEventListener('keydown', handleKeydown, true);
        };
    }, []);

    const ensurePathExpanded = (path: string) => {
        setExpandedDirectories((current) => {
            const next = new Set(current);

            for (const dir of getParentDirectories(path)) {
                next.add(dir);
            }

            return next;
        });
    };

    const setFilesAndSelection = (files: Record<string, ThemeEditorFile>, nextSelection?: SelectedNode) => {
        setCurrentFiles(files);

        if (nextSelection) {
            setSelectedNode(nextSelection);
            if (nextSelection.type === 'file') {
                ensurePathExpanded(nextSelection.path);
            }
            return;
        }

        if (selectedNode?.type === 'file' && files[selectedNode.path]) {
            return;
        }

        setSelectedNode(getDefaultSelection(files));
    };

    const handleCreateFile = async () => {
        const requestedPath = await requestInput({
            title: 'Create file',
            fieldTitle: 'File path',
            initialValue: 'partials/new-file.hbs',
            okLabel: 'Create file',
            prompt: 'Add a new editable file to this theme.'
        });
        const nextPath = requestedPath ? normaliseRelativePath(requestedPath) : null;

        if (!nextPath) {
            return;
        }

        if (!isEditablePath(nextPath)) {
            showToast({
                type: 'error',
                title: 'Only text files can be created here',
                message: 'Use a text-based theme file extension such as .hbs, .css, .js, or .json.'
            });
            return;
        }

        if (currentFiles[nextPath]) {
            showToast({
                type: 'error',
                title: 'File already exists'
            });
            return;
        }

        const nextFiles = {
            ...currentFiles,
            [nextPath]: {
                path: nextPath,
                editable: true,
                content: '',
                binary: null,
                date: new Date(),
                unixPermissions: null,
                dosPermissions: null
            }
        };

        setFilesAndSelection(nextFiles, {type: 'file', path: nextPath});
    };

    const handleRenameSelected = async () => {
        if (!selectedNode) {
            return;
        }

        const defaultValue = selectedNode.type === 'dir'
            ? selectedNode.path.replace(/\/$/, '')
            : selectedNode.path;
        const promptLabel = selectedNode.type === 'dir' ? 'Rename folder to' : 'Rename file to';
        const requestedPath = await requestInput({
            title: selectedNode.type === 'dir' ? 'Rename folder' : 'Rename file',
            fieldTitle: 'Path',
            initialValue: defaultValue,
            okLabel: 'Rename',
            prompt: promptLabel
        });
        const nextPath = requestedPath ? normaliseRelativePath(requestedPath) : null;

        if (!nextPath || nextPath === defaultValue) {
            return;
        }

        if (selectedNode.type === 'file') {
            const fileToRename = currentFiles[selectedNode.path];

            if (!isEditablePath(nextPath) && fileToRename.editable) {
                showToast({
                    type: 'error',
                    title: 'Text files must keep a text file extension'
                });
                return;
            }

            if (wouldRenameBinaryFileToEditable(fileToRename, nextPath)) {
                showToast({
                    type: 'error',
                    title: 'Binary files cannot be renamed to a text file',
                    message: 'Rename this file with a non-text extension to keep its contents intact.'
                });
                return;
            }

            if (currentFiles[nextPath]) {
                showToast({
                    type: 'error',
                    title: 'A file with that name already exists'
                });
                return;
            }

            const nextFiles = {...currentFiles};
            const file = nextFiles[selectedNode.path];
            delete nextFiles[selectedNode.path];
            nextFiles[nextPath] = {
                ...file,
                path: nextPath,
                editable: isEditablePath(nextPath)
            };

            setFilesAndSelection(nextFiles, {type: 'file', path: nextPath});
            return;
        }

        const nextDirectoryPath = `${nextPath}/`;

        if (nextDirectoryPath.startsWith(selectedNode.path)) {
            showToast({
                type: 'error',
                title: 'A folder cannot be renamed inside itself'
            });
            return;
        }

        const conflictingPath = Object.keys(currentFiles).find(path => path.startsWith(nextDirectoryPath));

        if (conflictingPath) {
            showToast({
                type: 'error',
                title: 'A folder with that path already exists'
            });
            return;
        }

        const nextFiles = createFolderRenameMap({
            files: currentFiles,
            oldPrefix: selectedNode.path,
            newPrefix: nextDirectoryPath
        });

        setFilesAndSelection(nextFiles, {type: 'dir', path: nextDirectoryPath});
        setExpandedDirectories((current) => {
            const next = new Set<string>();

            for (const directory of current) {
                if (!directory.startsWith(selectedNode.path)) {
                    next.add(directory);
                    continue;
                }

                next.add(`${nextDirectoryPath}${directory.slice(selectedNode.path.length)}`);
            }

            return next;
        });
    };

    const handleDeleteSelected = async () => {
        if (!selectedNode) {
            return;
        }

        if (selectedNode.type === 'file') {
            const confirmed = await requestConfirmation({
                title: 'Delete file',
                prompt: <>Delete <strong>{selectedNode.path}</strong> from this theme?</>,
                okLabel: 'Delete',
                okColor: 'red'
            });

            if (!confirmed) {
                return;
            }

            const nextFiles = {...currentFiles};
            delete nextFiles[selectedNode.path];
            setFilesAndSelection(nextFiles);
            return;
        }

        const matchingPaths = Object.keys(currentFiles).filter(path => path.startsWith(selectedNode.path));

        if (!matchingPaths.length) {
            return;
        }

        const confirmed = await requestConfirmation({
            title: 'Delete folder',
            prompt: <>Delete {matchingPaths.length} file{matchingPaths.length === 1 ? '' : 's'} from <strong>{selectedNode.path}</strong>?</>,
            okLabel: 'Delete',
            okColor: 'red'
        });

        if (!confirmed) {
            return;
        }

        const nextFiles = {...currentFiles};

        for (const path of matchingPaths) {
            delete nextFiles[path];
        }

        setFilesAndSelection(nextFiles);
    };

    const handleRevertPath = (path: string) => {
        const baseFile = baseFiles[path];
        const currentFile = currentFiles[path];
        const nextFiles = {...currentFiles};

        if (!baseFile && currentFile) {
            delete nextFiles[path];
        } else if (baseFile) {
            nextFiles[path] = {
                ...baseFile,
                binary: baseFile.binary ? new Uint8Array(baseFile.binary) : null
            };
        }

        setFilesAndSelection(nextFiles);
    };

    const requestSaveAsThemeName = async () => {
        const requestedName = await requestInput({
            title: 'Save as new theme',
            fieldTitle: 'Theme name',
            initialValue: `${currentThemeName}-edited`,
            okLabel: 'Continue',
            prompt: 'Default themes cannot be overwritten. Save your edits as a new theme instead.'
        });
        const nextName = requestedName?.trim().toLowerCase();

        if (!nextName) {
            return null;
        }

        if (!THEME_NAME_PATTERN.test(nextName)) {
            showToast({
                type: 'error',
                title: 'Invalid theme name',
                message: 'Use 1-64 characters, starting with a letter or number. Allowed: letters, numbers, dashes, and underscores.'
            });
            return null;
        }

        if (isDefaultThemeName(nextName)) {
            showToast({
                type: 'error',
                title: 'Built-in themes cannot be overwritten'
            });
            return null;
        }

        return nextName;
    };

    const handleSave = async () => {
        if (isSaving) {
            return;
        }

        if (changes.length === 0) {
            showToast({
                type: 'info',
                title: 'No changes to save'
            });
            return;
        }

        const previousThemeName = currentThemeName;
        const nextThemeName = isDefaultThemeName(previousThemeName) ? await requestSaveAsThemeName() : previousThemeName;

        if (!nextThemeName) {
            return;
        }

        const isSaveAs = nextThemeName !== previousThemeName;
        const themeExists = themesData?.themes.some(theme => theme.name === nextThemeName) || false;
        const confirmMessage = isSaveAs
            ? `Save your edits as "${nextThemeName}"?`
            : `Upload ${changes.length} changed file${changes.length === 1 ? '' : 's'} and replace "${previousThemeName}"?`;

        const confirmedSave = await requestConfirmation({
            title: isSaveAs ? 'Save theme as new copy' : 'Update theme',
            prompt: confirmMessage,
            okLabel: isSaveAs ? 'Save theme' : 'Replace theme'
        });

        if (!confirmedSave) {
            return;
        }

        if (isSaveAs && themeExists) {
            const confirmedOverwrite = await requestConfirmation({
                title: 'Overwrite theme',
                prompt: <><strong>{nextThemeName}</strong> already exists. Do you want to overwrite it?</>,
                okLabel: 'Overwrite',
                okColor: 'red'
            });

            if (!confirmedOverwrite) {
                return;
            }
        }

        setIsSaving(true);

        try {
            const blob = await packThemeArchive({
                files: currentFiles,
                rootPrefix
            });

            const formData = new FormData();
            formData.append('file', blob, `${nextThemeName}.zip`);

            const response = await fetch(`${getGhostPaths().apiRoot}/themes/upload/`, {
                method: 'POST',
                credentials: 'include',
                headers: {
                    Accept: 'application/json'
                },
                body: formData
            });

            const data = await response.json().catch(() => null) as ThemesInstallResponseType & {errors?: FatalErrors};

            if (!response.ok) {
                if (response.status === 422 && data?.errors) {
                    NiceModal.show(InvalidThemeModal, {
                        title: 'Invalid Theme',
                        prompt: <>Fix the validation errors below and try saving again.</>,
                        fatalErrors: data.errors as FatalErrors
                    });
                    return;
                }

                const serverError = (data as {errors?: Array<UploadSizeLimitError>} | null)?.errors?.[0];

                if (serverError?.code && UPLOAD_SIZE_LIMIT_TITLES[serverError.code]) {
                    showToast({
                        type: 'error',
                        title: UPLOAD_SIZE_LIMIT_TITLES[serverError.code],
                        message: buildUploadSizeLimitMessage(serverError)
                    });
                    return;
                }

                throw new Error(serverError?.message || 'Theme upload failed.');
            }

            const uploadedTheme = data.themes[0];
            const returnRoute = getReturnRouteFromHash();

            setBaseFiles(cloneThemeFiles(currentFiles));

            if (isSaveAs) {
                setCurrentThemeName(nextThemeName);
                setRootPrefix(rootPrefix ? `${nextThemeName}/` : '');
                updateRoute(buildThemeEditorRoute(nextThemeName, returnRoute));
            }

            await queryClient.invalidateQueries(['ThemesResponseType']);

            if (isSaveAs || uploadedTheme.errors?.length || uploadedTheme.warnings?.length) {
                NiceModal.show(ThemeInstalledModal, {
                    title: isSaveAs ? 'Theme saved' : 'Theme updated',
                    prompt: <><strong>{uploadedTheme.name}</strong> saved successfully.</>,
                    installedTheme: uploadedTheme
                });
            } else {
                showToast({
                    type: 'success',
                    title: 'Theme saved',
                    message: <div><span className='capitalize'>{uploadedTheme.name}</span> has been updated.</div>
                });
            }
        } catch (error) {
            handleError(error);
        } finally {
            setIsSaving(false);
        }
    };

    useEffect(() => {
        handleSaveRef.current = handleSave;
    });

    const openFile = (path: string) => {
        setSelectedNode({type: 'file', path});
        ensurePathExpanded(path);
    };

    const selectedFileStatus = selectedFile ? changesMap.get(selectedFile.path) : null;

    return (
        <div
            aria-label={`Edit theme ${themeName}`}
            aria-modal='true'
            className='dark fixed inset-0 z-[140] bg-[rgba(10,11,13,0.72)] text-[#e6e7ea] backdrop-blur-[4px]'
            data-testid='theme-code-editor-modal'
            role='dialog'
            onClick={(event) => {
                if (event.target === event.currentTarget) {
                    closeEditor();
                }
            }}
        >
            <div className='relative flex h-full w-full flex-col overflow-hidden bg-[#15171a]'>
                <ThemeEditorToolbar
                    changes={changes}
                    currentThemeName={currentThemeName}
                    isSaving={isSaving}
                    onClose={closeEditor}
                    onOpenReview={() => setIsReviewOpen(true)}
                    onSave={() => void handleSave()}
                />

                {loadError && (
                    <div className='border-b border-[#512828] bg-[#3a1d1d] px-4 py-2 text-[12px] text-[#ffbdbd]'>
                        {loadError}
                    </div>
                )}

                <div className='flex min-h-0 flex-1'>
                    <ThemeFileTree
                        changesMap={changesMap}
                        currentFiles={currentFiles}
                        expandedDirectories={expandedDirectories}
                        isLoading={isLoading}
                        selectedNode={selectedNode}
                        setExpandedDirectories={setExpandedDirectories}
                        setSelectedNode={setSelectedNode}
                        onCreateFile={handleCreateFile}
                        onDeleteSelected={handleDeleteSelected}
                        onOpenFile={openFile}
                        onRenameSelected={handleRenameSelected}
                    />

                    <section className='flex min-w-0 flex-1 flex-col bg-[#16181c]'>
                        <div className='flex items-center gap-2 border-b border-[#23262c] bg-[#17191d] px-4 py-2 text-[12px] text-[#8a8f98]'>
                            {selectedFile ? (
                                <>
                                    <span className='min-w-0 truncate font-medium text-[#e6e7ea]'>{selectedFile.path}</span>
                                    <span className='rounded bg-[#2a2d33] px-2 py-0.5 text-[10px] tracking-[0.04em] text-[#c8ccd3] uppercase'>
                                        {getLanguageLabel(selectedFile.path)}
                                    </span>
                                    {selectedFileStatus && (
                                        <button
                                            className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-[10px] tracking-[0.04em] uppercase ${selectedFileStatus === 'deleted' ? 'bg-[#4a2222] text-[#ffbdbd]' : selectedFileStatus === 'added' ? 'bg-[#17342a] text-[#a5e8c8]' : 'bg-[#3b2a16] text-[#f5a623]'}`}
                                            type='button'
                                            onClick={() => handleRevertPath(selectedFile.path)}
                                        >
                                            <Undo2 size={11} />
                                            Revert
                                        </button>
                                    )}
                                    <div className='grow' />
                                    {selectedFile.editable && (
                                        <button
                                            aria-label={isTextWrapEnabled ? 'Disable text wrap' : 'Enable text wrap'}
                                            aria-pressed={isTextWrapEnabled}
                                            className={wrapToggleClass(isTextWrapEnabled)}
                                            title={isTextWrapEnabled ? 'Disable text wrap' : 'Enable text wrap'}
                                            type='button'
                                            onClick={() => setIsTextWrapEnabled(value => !value)}
                                        >
                                            <TextWrap className='shrink-0' size={14} strokeWidth={2} />
                                        </button>
                                    )}
                                </>
                            ) : (
                                <span>No file selected</span>
                            )}
                        </div>

                        <div className='min-h-0 flex-1'>
                            {!selectedNode && !isLoading && (
                                <div className={editorPaneEmptyStateClass}>
                                    Select a file from the tree to start editing.
                                </div>
                            )}

                            {selectedNode?.type === 'dir' && (
                                <div className={editorPaneEmptyStateClass}>
                                    Folder selected. Choose a file to edit, or rename or delete the folder from the file pane.
                                </div>
                            )}

                            {selectedFile && !selectedFile.editable && (
                                <div className={editorPaneEmptyStateClass}>
                                    This file cannot be edited in the browser.
                                </div>
                            )}

                            {selectedFile?.editable && (
                                <CodeMirror
                                    key={`${selectedFile.path}:${editorExtensions.length}`}
                                    basicSetup={{
                                        highlightActiveLine: false,
                                        highlightActiveLineGutter: false
                                    }}
                                    className='h-full [&_.cm-button]:h-8 [&_.cm-button]:rounded-md [&_.cm-button]:border [&_.cm-button]:border-[#2f333b] [&_.cm-button]:bg-[#1f2228] [&_.cm-button]:bg-none [&_.cm-button]:px-3 [&_.cm-button]:text-[13px] [&_.cm-button]:text-[#c8ccd3] [&_.cm-button:hover]:bg-[#2a2d33] [&_.cm-content]:min-h-full [&_.cm-content]:py-3 [&_.cm-content_*::selection]:bg-[#355070] [&_.cm-cursor]:border-l-[#e6e7ea] [&_.cm-editor]:h-full [&_.cm-editor]:rounded-none [&_.cm-editor]:border-0 [&_.cm-editor]:bg-[#16181c] [&_.cm-gutters]:border-r-[#23262c] [&_.cm-gutters]:bg-[#17191d] [&_.cm-line::selection]:bg-[#355070] [&_.cm-panel]:bg-[#17191d] [&_.cm-panel]:shadow-none [&_.cm-panel.cm-search]:gap-2 [&_.cm-panel.cm-search]:px-3 [&_.cm-panel.cm-search]:py-2 [&_.cm-panel.cm-search]:text-[13px] [&_.cm-panels]:border-b [&_.cm-panels]:border-[#23262c] [&_.cm-panels]:bg-[#17191d] [&_.cm-panels]:text-[#c8ccd3] [&_.cm-scroller]:min-h-full [&_.cm-scroller]:overflow-auto [&_.cm-scroller]:bg-[#16181c] [&_.cm-search]:flex [&_.cm-search]:flex-wrap [&_.cm-search]:items-center [&_.cm-search]:gap-2 [&_.cm-search_label]:inline-flex [&_.cm-search_label]:items-center [&_.cm-search_label]:gap-1.5 [&_.cm-search_label]:text-[#a5abb4] [&_.cm-search_label_input]:h-4 [&_.cm-search_label_input]:w-4 [&_.cm-search_label_input]:accent-[#14b886] [&_.cm-searchMatch]:bg-[#243043] [&_.cm-searchMatch-selected]:bg-[#3b2a16] [&_.cm-searchMatch-selected]:outline-none [&_.cm-selectionBackground]:!bg-[#355070] [&_.cm-selectionLayer_.cm-selectionBackground]:!bg-[#355070] [&_.cm-textfield]:h-8 [&_.cm-textfield]:min-w-[220px] [&_.cm-textfield]:rounded-md [&_.cm-textfield]:border [&_.cm-textfield]:border-[#2f333b] [&_.cm-textfield]:bg-[#16181c] [&_.cm-textfield]:px-2.5 [&_.cm-textfield]:text-[#e6e7ea] [&_.cm-textfield]:outline-none [&_.cm-textfield]:placeholder:text-[#6a6f78]'
                                    extensions={editorExtensions}
                                    height='full'
                                    theme={oneDark}
                                    value={selectedFile.content || ''}
                                    autoFocus
                                    onChange={(value) => {
                                        setCurrentFiles(files => ({
                                            ...files,
                                            [selectedFile.path]: {
                                                ...files[selectedFile.path],
                                                content: value
                                            }
                                        }));
                                    }}
                                />
                            )}
                        </div>
                    </section>
                </div>

                {isReviewOpen && (
                    <ThemeReviewModal
                        reviewItems={reviewItems}
                        onClose={() => setIsReviewOpen(false)}
                        onOpenInEditor={(path) => {
                            openFile(path);
                            setIsReviewOpen(false);
                        }}
                        onRevert={handleRevertPath}
                    />
                )}
            </div>
        </div>
    );
};

export default ThemeCodeEditorModal;
