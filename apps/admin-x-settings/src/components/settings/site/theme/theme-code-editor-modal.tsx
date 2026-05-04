import CodeMirror, {EditorView} from '@uiw/react-codemirror';
import InvalidThemeModal, {type FatalErrors} from './invalid-theme-modal';
import NiceModal, {useModal} from '@ebay/nice-modal-react';
import React, {useEffect, useMemo, useState} from 'react';
import ThemeInstalledModal from './theme-installed-modal';
import {
    ChevronDown,
    ChevronRight,
    CircleDot,
    FileCode2,
    Folder,
    FolderOpen,
    Pencil,
    Plus,
    Save,
    TextWrap,
    Trash2,
    Undo2,
    X
} from 'lucide-react';
import {Modal, TextField, showToast} from '@tryghost/admin-x-design-system';
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
import {useBrowseThemes} from '@tryghost/admin-x-framework/api/themes';
import {useHandleError} from '@tryghost/admin-x-framework/hooks';
import {useQueryClient} from '@tanstack/react-query';
import {useRouting} from '@tryghost/admin-x-framework/routing';
import type {ThemeChange, ThemeEditorFile} from './theme-editor-utils';
import type {ThemesInstallResponseType} from '@tryghost/admin-x-framework/api/themes';

type SelectedNode =
    | {type: 'file'; path: string}
    | {type: 'dir'; path: string}
    | null;

type TreeNode = {
    type: 'dir' | 'file';
    name: string;
    path: string;
    editable?: boolean;
    children?: Map<string, TreeNode>;
};

type ReviewItem = {
    path: string;
    editable: boolean;
    status: ThemeChange['status'];
    before: string | null;
    after: string | null;
};

const buildTree = (files: Record<string, ThemeEditorFile>) => {
    const root: TreeNode = {
        type: 'dir',
        name: '',
        path: '',
        children: new Map()
    };

    for (const path of Object.keys(files).sort()) {
        const segments = path.split('/');
        let cursor = root;

        for (let index = 0; index < segments.length; index += 1) {
            const segment = segments[index];
            const isLast = index === segments.length - 1;

            if (isLast) {
                cursor.children!.set(segment, {
                    type: 'file',
                    name: segment,
                    path,
                    editable: files[path].editable
                });
                continue;
            }

            const dirPath = `${segments.slice(0, index + 1).join('/')}/`;
            const existing = cursor.children!.get(segment);

            if (existing?.type === 'dir') {
                cursor = existing;
                continue;
            }

            const next: TreeNode = {
                type: 'dir',
                name: segment,
                path: dirPath,
                children: new Map()
            };

            cursor.children!.set(segment, next);
            cursor = next;
        }
    }

    return root;
};

const sortTreeNodes = (nodes: TreeNode[]) => {
    return nodes.sort((left, right) => {
        if (left.type !== right.type) {
            return left.type === 'dir' ? -1 : 1;
        }

        return left.name.localeCompare(right.name);
    });
};

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

const buildReviewItems = ({
    baseFiles,
    currentFiles,
    changes
}: {
    baseFiles: Record<string, ThemeEditorFile>;
    currentFiles: Record<string, ThemeEditorFile>;
    changes: ThemeChange[];
}) => {
    return changes.map((change) => {
        const baseFile = baseFiles[change.path];
        const currentFile = currentFiles[change.path];

        return {
            path: change.path,
            editable: change.editable,
            status: change.status,
            before: baseFile?.editable ? (baseFile.content ?? '') : null,
            after: currentFile?.editable ? (currentFile.content ?? '') : null
        };
    });
};

const formatReviewSummary = (reviewItems: ReviewItem[]) => {
    const added = reviewItems.filter(item => item.status === 'added').length;
    const modified = reviewItems.filter(item => item.status === 'modified').length;
    const deleted = reviewItems.filter(item => item.status === 'deleted').length;

    return `${modified} modified, ${added} added, ${deleted} deleted`;
};

const getReturnRouteFromHash = () => {
    const hash = window.location.hash.substring(1);
    const domain = `${window.location.protocol}//${window.location.hostname}`;
    const url = new URL(hash || '/', domain);

    return url.searchParams.get('from');
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

const iconButtonClass = 'inline-flex h-7 w-7 items-center justify-center rounded-full border border-[#2f333b] bg-transparent text-[#c8ccd3] transition-colors hover:bg-[#1f2228] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4a9eff] disabled:cursor-not-allowed disabled:opacity-50';
const toolbarButtonClass = 'inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-[13px] font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4a9eff] disabled:cursor-not-allowed disabled:opacity-50';
const ghostButtonClass = `${toolbarButtonClass} border-[#2f333b] bg-transparent text-[#e6e7ea] hover:bg-[#1f2228]`;
const primaryButtonClass = `${toolbarButtonClass} border-transparent bg-green text-black hover:bg-green-400`;
const wrapToggleClass = (active: boolean) => `inline-flex h-5 w-5 items-center justify-center rounded-sm text-[#c8ccd3] transition-opacity hover:opacity-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4a9eff] ${active ? 'opacity-100' : 'opacity-60'}`;
const fileActionButtonClass = 'inline-flex h-5 w-5 items-center justify-center rounded-sm text-[#c8ccd3] transition-opacity hover:opacity-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4a9eff] disabled:cursor-not-allowed disabled:opacity-30';
const editorSelectionTheme = EditorView.theme({
    '&.cm-focused > .cm-scroller > .cm-selectionLayer .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection': {
        backgroundColor: '#355070'
    },
    '.cm-content ::selection': {
        color: '#ffffff'
    }
}, {dark: true});

type ThemeEditorConfirmModalProps = {
    title: string;
    prompt: React.ReactNode;
    cancelLabel?: string;
    okLabel?: string;
    okColor?: 'black' | 'red' | 'green' | 'outline';
};

const ThemeEditorConfirmModal = NiceModal.create<ThemeEditorConfirmModalProps>(({
    title,
    prompt,
    cancelLabel = 'Cancel',
    okLabel = 'OK',
    okColor = 'black'
}) => {
    const modal = useModal();

    const closeWithResult = (result: boolean) => {
        modal.resolve(result);
        modal.remove();
    };

    return (
        <Modal
            backDropClick={false}
            cancelLabel={cancelLabel}
            okColor={okColor}
            okLabel={okLabel}
            testId='theme-editor-confirm-modal'
            title={title}
            width={540}
            onCancel={() => closeWithResult(false)}
            onOk={() => closeWithResult(true)}
        >
            <div className='py-4'>
                {prompt}
            </div>
        </Modal>
    );
});

type ThemeEditorInputModalProps = {
    title: string;
    prompt?: React.ReactNode;
    fieldTitle: string;
    initialValue: string;
    placeholder?: string;
    cancelLabel?: string;
    okLabel?: string;
};

const ThemeEditorInputModal = NiceModal.create<ThemeEditorInputModalProps>(({
    title,
    prompt,
    fieldTitle,
    initialValue,
    placeholder,
    cancelLabel = 'Cancel',
    okLabel = 'Continue'
}) => {
    const modal = useModal();
    const [value, setValue] = useState(initialValue);

    const closeWithResult = (result: string | null) => {
        modal.resolve(result);
        modal.remove();
    };

    return (
        <Modal
            backDropClick={false}
            cancelLabel={cancelLabel}
            okDisabled={!value.trim()}
            okLabel={okLabel}
            testId='theme-editor-input-modal'
            title={title}
            width={540}
            onCancel={() => closeWithResult(null)}
            onOk={() => closeWithResult(value)}
        >
            <div className='flex flex-col gap-4 py-4'>
                {prompt}
                <TextField
                    clearBg={false}
                    placeholder={placeholder}
                    title={fieldTitle}
                    value={value}
                    autoFocus
                    onChange={event => setValue(event.target.value)}
                />
            </div>
        </Modal>
    );
});

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
    const [selectedReviewPath, setSelectedReviewPath] = useState<string | null>(null);
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
    const selectedReviewItem = reviewItems.find(item => item.path === selectedReviewPath) || reviewItems[0] || null;

    useEffect(() => {
        if (!selectedReviewItem) {
            setSelectedReviewPath(null);
            return;
        }

        if (!selectedReviewPath || !reviewItems.some(item => item.path === selectedReviewPath)) {
            setSelectedReviewPath(selectedReviewItem.path);
        }
    }, [reviewItems, selectedReviewItem, selectedReviewPath]);

    useEffect(() => {
        let isMounted = true;

        if (!selectedFile?.editable) {
            setEditorExtensions([]);
            return () => {
                isMounted = false;
            };
        }

        Promise.all([oneDark, getLanguageExtension(selectedFile.path)]).then((extensions) => {
            if (isMounted) {
                setEditorExtensions([
                    search({top: true}),
                    ...extensions,
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

    useEffect(() => {
        const handleKeydown = (event: KeyboardEvent) => {
            if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's') {
                event.preventDefault();
                void handleSave();
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
    });

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

        if (nextName.includes('/') || nextName.includes('\\')) {
            showToast({
                type: 'error',
                title: 'Theme names cannot contain slashes'
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

                throw new Error((data as {errors?: Array<{message?: string}>} | null)?.errors?.[0]?.message || 'Theme upload failed.');
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

    const openFile = (path: string) => {
        setSelectedNode({type: 'file', path});
        ensurePathExpanded(path);
    };

    const renderTreeNode = (node: TreeNode, depth = 0): React.ReactNode => {
        if (node.type === 'file') {
            const isSelected = selectedNode?.type === 'file' && selectedNode.path === node.path;
            const changeStatus = changesMap.get(node.path);

            return (
                <button
                    key={node.path}
                    className={`flex min-h-6 w-full items-center gap-1.5 rounded px-2 py-1 text-left text-[13px] leading-5 ${isSelected ? 'bg-[#243043] text-white' : 'text-[#c8ccd3] hover:bg-[#1f2228]'} ${!node.editable ? 'opacity-70' : ''}`}
                    style={{paddingLeft: `${depth * 14 + 8}px`}}
                    type='button'
                    onClick={() => openFile(node.path)}
                >
                    <span className='w-3 shrink-0' />
                    <FileCode2 size={14} />
                    <span className='min-w-0 grow truncate'>{node.name}</span>
                    {changeStatus && (
                        <span className={`mr-1 h-1.5 w-1.5 shrink-0 rounded-full ${changeStatus === 'deleted' ? 'bg-[#ff6b6b]' : changeStatus === 'added' ? 'bg-[#14b886]' : 'bg-[#f5a623]'}`} />
                    )}
                </button>
            );
        }

        const isExpanded = expandedDirectories.has(node.path);
        const isSelected = selectedNode?.type === 'dir' && selectedNode.path === node.path;
        const children = sortTreeNodes(Array.from(node.children?.values() || []));

        return (
            <div key={node.path || 'root'}>
                {node.path && (
                    <button
                        className={`flex min-h-6 w-full items-center gap-1.5 rounded px-2 py-1 text-left text-[13px] leading-5 ${isSelected ? 'bg-[#202630] text-white' : 'text-[#c8ccd3] hover:bg-[#1f2228]'}`}
                        style={{paddingLeft: `${depth * 14 + 8}px`}}
                        type='button'
                        onClick={() => {
                            setSelectedNode({type: 'dir', path: node.path});
                            setExpandedDirectories((current) => {
                                const next = new Set(current);

                                if (next.has(node.path)) {
                                    next.delete(node.path);
                                } else {
                                    next.add(node.path);
                                }

                                return next;
                            });
                        }}
                    >
                        {isExpanded ? <ChevronDown className='shrink-0 text-[#6a6f78]' size={12} /> : <ChevronRight className='shrink-0 text-[#6a6f78]' size={12} />}
                        {isExpanded ? <FolderOpen className='shrink-0 text-[#8a8f98]' size={14} /> : <Folder className='shrink-0 text-[#8a8f98]' size={14} />}
                        <span className='truncate'>{node.name}</span>
                    </button>
                )}
                {(node.path === '' || isExpanded) && (
                    <div>
                        {children.map(child => renderTreeNode(child, node.path ? depth + 1 : depth))}
                    </div>
                )}
            </div>
        );
    };

    const selectedFileStatus = selectedFile ? changesMap.get(selectedFile.path) : null;
    const reviewSummary = formatReviewSummary(reviewItems);

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
                <div className='flex items-center gap-3 border-b border-[#23262c] bg-[#1a1d21] px-4 py-3'>
                    <div className='flex min-w-0 items-baseline gap-2'>
                        <h2 className='truncate text-[14px] font-semibold text-[#f4f5f7]'>Edit theme</h2>
                        <span className='truncate text-[12px] text-[#8a8f98]'>{currentThemeName}</span>
                    </div>
                    {changes.length > 0 && (
                        <button
                            className='rounded-full border border-transparent bg-[#3b2a16] px-2.5 py-1 text-[11px] leading-none text-[#f5a623] hover:bg-[#49311a]'
                            type='button'
                            onClick={() => {
                                setSelectedReviewPath(reviewItems[0]?.path ?? null);
                                setIsReviewOpen(true);
                            }}
                        >
                            {changes.length} {changes.length === 1 ? 'file modified' : 'files modified'}
                        </button>
                    )}
                    <div className='grow' />
                    <button className={ghostButtonClass} type='button' onClick={closeEditor}>
                        <X size={14} />
                        Close
                    </button>
                    <button className={primaryButtonClass} disabled={isSaving} type='button' onClick={() => void handleSave()}>
                        <Save size={14} />
                        {isSaving ? 'Saving…' : 'Save'}
                    </button>
                </div>

                {loadError && (
                    <div className='border-b border-[#512828] bg-[#3a1d1d] px-4 py-2 text-[12px] text-[#ffbdbd]'>
                        {loadError}
                    </div>
                )}

                <div className='flex min-h-0 flex-1'>
                    <aside className='flex w-[280px] shrink-0 flex-col border-r border-[#23262c] bg-[#16181c]'>
                        <div className='flex items-center justify-between gap-2 border-b border-[#23262c] px-3 py-2'>
                            <div className='text-[12px] font-medium text-[#c8ccd3]'>{Object.keys(currentFiles).length} files</div>
                            <div className='flex items-center gap-2'>
                                <button aria-label='New file' className={fileActionButtonClass} type='button' onClick={handleCreateFile}>
                                    <Plus size={13} />
                                </button>
                                <button aria-label='Rename selected item' className={fileActionButtonClass} disabled={!selectedNode} type='button' onClick={handleRenameSelected}>
                                    <Pencil size={13} />
                                </button>
                                <button aria-label='Delete selected item' className={fileActionButtonClass} disabled={!selectedNode} type='button' onClick={handleDeleteSelected}>
                                    <Trash2 size={13} />
                                </button>
                            </div>
                        </div>
                        <div className='min-h-0 flex-1 overflow-y-auto px-2 py-2'>
                            {isLoading ? (
                                <div className='flex h-full flex-col items-center justify-center gap-3 text-center text-[13px] text-[#8a8f98]'>
                                    <div className='h-5 w-5 animate-spin rounded-full border-2 border-[#2f333b] border-t-[#14b886]' />
                                    <span>Loading theme files…</span>
                                </div>
                            ) : Object.keys(currentFiles).length === 0 ? (
                                <div className='px-3 py-4 text-[12px] text-[#8a8f98]'>This theme archive does not contain any files.</div>
                            ) : (
                                renderTreeNode(buildTree(currentFiles))
                            )}
                        </div>
                    </aside>

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
                                <div className='flex h-full items-center justify-center p-8 text-center text-[13px] text-[#6a6f78]'>
                                    Select a file from the tree to start editing.
                                </div>
                            )}

                            {selectedNode?.type === 'dir' && (
                                <div className='flex h-full items-center justify-center p-8 text-center text-[13px] text-[#6a6f78]'>
                                    Folder selected. Choose a file to edit, or rename or delete the folder from the file pane.
                                </div>
                            )}

                            {selectedFile && !selectedFile.editable && (
                                <div className='flex h-full items-center justify-center p-8 text-center text-[13px] text-[#6a6f78]'>
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
                    <div className='absolute inset-0 z-10 flex items-center justify-center bg-[rgba(8,10,14,0.64)]' onClick={() => setIsReviewOpen(false)}>
                        <div className='flex h-[min(78vh,calc(100%-24px))] w-[min(1240px,calc(100%-24px))] flex-col overflow-hidden rounded-[10px] border border-[#2b3038] bg-[#171a20] p-4 shadow-[0_24px_64px_rgba(0,0,0,0.45)]' onClick={event => event.stopPropagation()}>
                            <div className='mb-2 flex items-center justify-between gap-3'>
                                <div>
                                    <h3 className='text-[16px] font-semibold text-[#f4f5f7]'>All changes</h3>
                                    <p className='mt-1 text-[12px] text-[#9aa0aa]'>{reviewSummary}</p>
                                </div>
                                <button aria-label='Close review' className={iconButtonClass} type='button' onClick={() => setIsReviewOpen(false)}>
                                    <X size={14} />
                                </button>
                            </div>

                            <div className='grid min-h-0 flex-1 grid-cols-[320px_1fr] gap-3'>
                                <div className='min-h-0 overflow-auto rounded-lg border border-[#2a2d33] bg-[#111319] p-2'>
                                    {reviewItems.map(item => (
                                        <button
                                            key={`${item.status}-${item.path}`}
                                            className={`flex w-full items-center gap-2 rounded-md border px-3 py-2 text-left text-[13px] ${selectedReviewItem?.path === item.path ? 'border-[#355070] bg-[#243043] text-white' : 'border-transparent text-[#d4d8de] hover:bg-[#1d2028]'}`}
                                            type='button'
                                            onClick={() => setSelectedReviewPath(item.path)}
                                        >
                                            <span className={`rounded px-1.5 py-0.5 text-[10px] tracking-[0.04em] uppercase ${item.status === 'deleted' ? 'bg-[#4a2222] text-[#ffbdbd]' : item.status === 'added' ? 'bg-[#17342a] text-[#a5e8c8]' : 'bg-[#3b2a16] text-[#f5a623]'}`}>
                                                {item.status}
                                            </span>
                                            <span className='min-w-0 grow truncate'>{item.path}</span>
                                            {!item.editable && <CircleDot className='text-[#6a6f78]' size={12} />}
                                        </button>
                                    ))}
                                    {reviewItems.length === 0 && (
                                        <div className='px-3 py-4 text-[12px] text-[#8a8f98]'>No unsaved changes.</div>
                                    )}
                                </div>

                                <div className='flex min-h-0 flex-col overflow-hidden rounded-lg border border-[#2a2d33] bg-[#111319]'>
                                    {selectedReviewItem ? (
                                        <>
                                            <div className='flex items-center gap-2 border-b border-[#23262c] px-4 py-3'>
                                                <div className='min-w-0 grow'>
                                                    <div className='truncate text-[13px] font-medium text-[#f4f5f7]'>{selectedReviewItem.path}</div>
                                                    <div className='mt-1 text-[12px] text-[#8a8f98]'>
                                                        {selectedReviewItem.editable ? 'Text file preview' : 'Binary file'}
                                                    </div>
                                                </div>
                                                {selectedReviewItem.status !== 'deleted' && (
                                                    <button className={ghostButtonClass} type='button' onClick={() => {
                                                        openFile(selectedReviewItem.path);
                                                        setIsReviewOpen(false);
                                                    }}>
                                                        Open in editor
                                                    </button>
                                                )}
                                                <button className={ghostButtonClass} type='button' onClick={() => handleRevertPath(selectedReviewItem.path)}>
                                                    <Undo2 size={14} />
                                                    Revert
                                                </button>
                                            </div>

                                            {!selectedReviewItem.editable ? (
                                                <div className='flex flex-1 items-center justify-center p-8 text-center text-[13px] text-[#6a6f78]'>
                                                    Binary files are kept intact in the archive. Open or revert the change from here, but binary contents are not shown.
                                                </div>
                                            ) : selectedReviewItem.status === 'added' ? (
                                                <div className='min-h-0 flex-1 overflow-auto p-4'>
                                                    <div className='mb-2 text-[11px] font-semibold tracking-[0.08em] text-[#8a8f98] uppercase'>After</div>
                                                    <pre className='overflow-auto rounded-md border border-[#23262c] bg-[#15171a] p-4 text-[12px] leading-5 text-[#d4d8de]'>{selectedReviewItem.after ?? ''}</pre>
                                                </div>
                                            ) : selectedReviewItem.status === 'deleted' ? (
                                                <div className='min-h-0 flex-1 overflow-auto p-4'>
                                                    <div className='mb-2 text-[11px] font-semibold tracking-[0.08em] text-[#8a8f98] uppercase'>Before</div>
                                                    <pre className='overflow-auto rounded-md border border-[#23262c] bg-[#15171a] p-4 text-[12px] leading-5 text-[#d4d8de]'>{selectedReviewItem.before ?? ''}</pre>
                                                </div>
                                            ) : (
                                                <div className='grid min-h-0 flex-1 grid-cols-2 gap-4 p-4'>
                                                    <div className='min-h-0 overflow-auto'>
                                                        <div className='mb-2 text-[11px] font-semibold tracking-[0.08em] text-[#8a8f98] uppercase'>Before</div>
                                                        <pre className='h-full overflow-auto rounded-md border border-[#23262c] bg-[#15171a] p-4 text-[12px] leading-5 text-[#d4d8de]'>{selectedReviewItem.before ?? ''}</pre>
                                                    </div>
                                                    <div className='min-h-0 overflow-auto'>
                                                        <div className='mb-2 text-[11px] font-semibold tracking-[0.08em] text-[#8a8f98] uppercase'>After</div>
                                                        <pre className='h-full overflow-auto rounded-md border border-[#23262c] bg-[#15171a] p-4 text-[12px] leading-5 text-[#d4d8de]'>{selectedReviewItem.after ?? ''}</pre>
                                                    </div>
                                                </div>
                                            )}
                                        </>
                                    ) : (
                                        <div className='flex flex-1 items-center justify-center p-8 text-center text-[13px] text-[#6a6f78]'>
                                            Select a changed file to review it.
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ThemeCodeEditorModal;
