import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {
    ChevronDown,
    ChevronRight,
    FileCode2,
    Folder,
    FolderOpen,
    Pencil,
    Plus,
    Trash2
} from 'lucide-react';
import type {ThemeChange, ThemeEditorFile} from './theme-editor-utils';

export type SelectedNode =
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

type VisibleNode = {
    node: TreeNode;
    depth: number;
    // 1-based position among visible siblings at the same depth + the total
    // count of siblings, surfaced as aria-posinset / aria-setsize so screen
    // readers can announce "item N of M" inside the flattened tree.
    posInSet: number;
    setSize: number;
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

const collectVisibleNodes = (root: TreeNode, expanded: Set<string>): VisibleNode[] => {
    const result: VisibleNode[] = [];

    const visit = (node: TreeNode, depth: number, posInSet: number, setSize: number) => {
        result.push({node, depth, posInSet, setSize});

        if (node.type === 'dir' && expanded.has(node.path) && node.children) {
            const sorted = sortTreeNodes(Array.from(node.children.values()));
            sorted.forEach((child, index) => visit(child, depth + 1, index + 1, sorted.length));
        }
    };

    const topLevel = sortTreeNodes(Array.from(root.children?.values() || []));
    topLevel.forEach((node, index) => visit(node, 0, index + 1, topLevel.length));

    return result;
};

// "Parent" within the visible-node list — the nearest preceding entry whose
// depth is strictly less. Used for Arrow Left collapsed-or-leaf behavior so we
// don't have to derive the parent path from string-splitting (which would miss
// cases where a directory only became "visible" because a sibling was expanded).
const findParentVisibleNode = (visibleNodes: VisibleNode[], index: number): VisibleNode | null => {
    const currentDepth = visibleNodes[index]?.depth ?? 0;

    for (let i = index - 1; i >= 0; i -= 1) {
        if (visibleNodes[i].depth < currentDepth) {
            return visibleNodes[i];
        }
    }

    return null;
};

const findNodeIndex = (visibleNodes: VisibleNode[], selected: SelectedNode): number => {
    if (!selected) {
        return -1;
    }

    return visibleNodes.findIndex(({node}) => node.type === selected.type && node.path === selected.path);
};

const fileActionButtonClass = 'inline-flex h-5 w-5 items-center justify-center rounded-sm text-[#c8ccd3] transition-opacity hover:opacity-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4a9eff] disabled:cursor-not-allowed disabled:opacity-30';

type ThemeFileTreeProps = {
    currentFiles: Record<string, ThemeEditorFile>;
    selectedNode: SelectedNode;
    setSelectedNode: (node: SelectedNode) => void;
    expandedDirectories: Set<string>;
    setExpandedDirectories: React.Dispatch<React.SetStateAction<Set<string>>>;
    changesMap: Map<string, ThemeChange['status']>;
    isLoading: boolean;
    onCreateFile: () => void;
    onRenameSelected: () => void;
    onDeleteSelected: () => void;
    onOpenFile: (path: string) => void;
};

const ThemeFileTree: React.FC<ThemeFileTreeProps> = ({
    currentFiles,
    selectedNode,
    setSelectedNode,
    expandedDirectories,
    setExpandedDirectories,
    changesMap,
    isLoading,
    onCreateFile,
    onRenameSelected,
    onDeleteSelected,
    onOpenFile
}) => {
    const tree = useMemo(() => buildTree(currentFiles), [currentFiles]);
    const visibleNodes = useMemo(() => collectVisibleNodes(tree, expandedDirectories), [tree, expandedDirectories]);

    const buttonRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
    const [pendingFocusKey, setPendingFocusKey] = useState<string | null>(null);

    // Buttons are keyed by `${type}:${path}` so a file and a dir at the same
    // path (a synthetic case, but possible in renames) don't collide.
    const refKeyFor = useCallback((type: 'file' | 'dir', path: string) => `${type}:${path}`, []);

    useEffect(() => {
        if (!pendingFocusKey) {
            return;
        }

        const button = buttonRefs.current.get(pendingFocusKey);

        if (button) {
            button.focus();
        }

        setPendingFocusKey(null);
    }, [pendingFocusKey, visibleNodes]);

    const selectedIndex = findNodeIndex(visibleNodes, selectedNode);
    // Roving tabindex: the selected node owns tabIndex=0 so Tab lands on it.
    // If nothing is selected, the first visible node becomes tabbable so the
    // tree is still keyboard-reachable from the toolbar.
    const tabbableIndex = selectedIndex >= 0 ? selectedIndex : 0;

    const moveSelectionToVisible = useCallback((index: number) => {
        const entry = visibleNodes[index];

        if (!entry) {
            return;
        }

        setSelectedNode({type: entry.node.type, path: entry.node.path});
        setPendingFocusKey(refKeyFor(entry.node.type, entry.node.path));
    }, [visibleNodes, setSelectedNode, refKeyFor]);

    const toggleDirectory = useCallback((path: string) => {
        setExpandedDirectories((current) => {
            const next = new Set(current);

            if (next.has(path)) {
                next.delete(path);
            } else {
                next.add(path);
            }

            return next;
        });
    }, [setExpandedDirectories]);

    const handleKeyDown = useCallback((event: React.KeyboardEvent<HTMLDivElement>) => {
        // Avoid hijacking keys that bubble up from the toolbar's icon
        // buttons or other interactive children — only treeitem buttons
        // carry data-tree-item.
        const target = event.target as HTMLElement;

        if (!target.closest('[data-tree-item="true"]')) {
            return;
        }

        // Plain modifier combos belong to the surrounding admin (Cmd+S, Cmd+R
        // and friends) — bail out unless this is the Cmd/Ctrl+Backspace
        // delete shortcut, which we want to land in the Backspace case below.
        const isDeleteShortcut = event.key === 'Backspace' && (event.metaKey || event.ctrlKey);

        if ((event.metaKey || event.ctrlKey || event.altKey) && !isDeleteShortcut) {
            return;
        }

        const currentIndex = selectedIndex >= 0 ? selectedIndex : 0;
        const current = visibleNodes[currentIndex];

        switch (event.key) {
        case 'ArrowDown':
            event.preventDefault();
            if (currentIndex < visibleNodes.length - 1) {
                moveSelectionToVisible(currentIndex + 1);
            }
            return;
        case 'ArrowUp':
            event.preventDefault();
            if (currentIndex > 0) {
                moveSelectionToVisible(currentIndex - 1);
            }
            return;
        case 'ArrowRight':
            event.preventDefault();
            if (!current) {
                return;
            }
            if (current.node.type === 'dir') {
                if (!expandedDirectories.has(current.node.path)) {
                    toggleDirectory(current.node.path);
                    return;
                }
                if (currentIndex < visibleNodes.length - 1 && visibleNodes[currentIndex + 1].depth > current.depth) {
                    moveSelectionToVisible(currentIndex + 1);
                }
            }
            return;
        case 'ArrowLeft':
            event.preventDefault();
            if (!current) {
                return;
            }
            if (current.node.type === 'dir' && expandedDirectories.has(current.node.path)) {
                toggleDirectory(current.node.path);
                return;
            }
            {
                const parent = findParentVisibleNode(visibleNodes, currentIndex);
                if (parent) {
                    const parentIndex = visibleNodes.indexOf(parent);
                    moveSelectionToVisible(parentIndex);
                }
            }
            return;
        case 'F2':
            event.preventDefault();
            if (selectedNode) {
                onRenameSelected();
            }
            return;
        case 'Delete':
        case 'Backspace':
            if (event.key === 'Backspace' && !(event.metaKey || event.ctrlKey)) {
                // Plain Backspace inside a content-editable would normally
                // delete text. We only treat it as "delete node" when Cmd
                // or Ctrl is held (matching the macOS Finder / VS Code
                // delete shortcut), which is the only way Backspace gets
                // past the modifier bailout above.
                return;
            }
            event.preventDefault();
            if (selectedNode) {
                onDeleteSelected();
            }
            return;
        default:
        }
    }, [visibleNodes, selectedIndex, selectedNode, expandedDirectories, moveSelectionToVisible, toggleDirectory, onRenameSelected, onDeleteSelected]);

    const registerButtonRef = useCallback((key: string) => (element: HTMLButtonElement | null) => {
        if (element) {
            buttonRefs.current.set(key, element);
        } else {
            buttonRefs.current.delete(key);
        }
    }, []);

    const renderTreeItem = (entry: VisibleNode, index: number) => {
        const {node, depth, posInSet, setSize} = entry;
        const isSelected = index === selectedIndex;
        const isTabbable = index === tabbableIndex;
        const key = refKeyFor(node.type, node.path);

        if (node.type === 'file') {
            const changeStatus = changesMap.get(node.path);

            return (
                <button
                    key={node.path}
                    ref={registerButtonRef(key)}
                    aria-level={depth + 1}
                    aria-posinset={posInSet}
                    aria-selected={isSelected}
                    aria-setsize={setSize}
                    className={`flex min-h-6 w-full items-center gap-1.5 rounded px-2 py-1 text-left text-[13px] leading-5 ${isSelected ? 'bg-[#243043] text-white' : 'text-[#c8ccd3] hover:bg-[#1f2228]'} ${!node.editable ? 'opacity-70' : ''}`}
                    data-tree-item='true'
                    role='treeitem'
                    style={{paddingLeft: `${depth * 14 + 8}px`}}
                    tabIndex={isTabbable ? 0 : -1}
                    type='button'
                    onClick={() => onOpenFile(node.path)}
                >
                    <span aria-hidden='true' className='w-3 shrink-0' />
                    <FileCode2 aria-hidden='true' size={14} />
                    <span className='min-w-0 grow truncate'>{node.name}</span>
                    {changeStatus && (
                        <span aria-hidden='true' className={`mr-1 h-1.5 w-1.5 shrink-0 rounded-full ${changeStatus === 'deleted' ? 'bg-[#ff6b6b]' : changeStatus === 'added' ? 'bg-[#14b886]' : 'bg-[#f5a623]'}`} />
                    )}
                </button>
            );
        }

        const isExpanded = expandedDirectories.has(node.path);

        return (
            <button
                key={node.path}
                ref={registerButtonRef(key)}
                aria-expanded={isExpanded}
                aria-level={depth + 1}
                aria-posinset={posInSet}
                aria-selected={isSelected}
                aria-setsize={setSize}
                className={`flex min-h-6 w-full items-center gap-1.5 rounded px-2 py-1 text-left text-[13px] leading-5 ${isSelected ? 'bg-[#202630] text-white' : 'text-[#c8ccd3] hover:bg-[#1f2228]'}`}
                data-tree-item='true'
                role='treeitem'
                style={{paddingLeft: `${depth * 14 + 8}px`}}
                tabIndex={isTabbable ? 0 : -1}
                type='button'
                onClick={() => {
                    setSelectedNode({type: 'dir', path: node.path});
                    toggleDirectory(node.path);
                }}
            >
                {isExpanded ? <ChevronDown aria-hidden='true' className='shrink-0 text-[#6a6f78]' size={12} /> : <ChevronRight aria-hidden='true' className='shrink-0 text-[#6a6f78]' size={12} />}
                {isExpanded ? <FolderOpen aria-hidden='true' className='shrink-0 text-[#8a8f98]' size={14} /> : <Folder aria-hidden='true' className='shrink-0 text-[#8a8f98]' size={14} />}
                <span className='truncate'>{node.name}</span>
            </button>
        );
    };

    return (
        <aside className='flex w-[280px] shrink-0 flex-col border-r border-[#23262c] bg-[#16181c]'>
            <div className='flex items-center justify-between gap-2 border-b border-[#23262c] px-3 py-2'>
                <div className='text-[12px] font-medium text-[#c8ccd3]'>{Object.keys(currentFiles).length} files</div>
                <div className='flex items-center gap-2'>
                    <button aria-label='New file' className={fileActionButtonClass} type='button' onClick={onCreateFile}>
                        <Plus size={13} />
                    </button>
                    <button aria-label='Rename selected item' className={fileActionButtonClass} disabled={!selectedNode} type='button' onClick={onRenameSelected}>
                        <Pencil size={13} />
                    </button>
                    <button aria-label='Delete selected item' className={fileActionButtonClass} disabled={!selectedNode} type='button' onClick={onDeleteSelected}>
                        <Trash2 size={13} />
                    </button>
                </div>
            </div>
            <div className='min-h-0 flex-1 overflow-y-auto px-2 py-2' onKeyDown={handleKeyDown}>
                {isLoading ? (
                    <div className='flex h-full flex-col items-center justify-center gap-3 text-center text-[13px] text-[#8a8f98]'>
                        <div className='h-5 w-5 animate-spin rounded-full border-2 border-[#2f333b] border-t-[#14b886]' />
                        <span>Loading theme files…</span>
                    </div>
                ) : Object.keys(currentFiles).length === 0 ? (
                    <div className='px-3 py-4 text-[12px] text-[#8a8f98]'>This theme archive does not contain any files.</div>
                ) : (
                    <div aria-label='Theme files' role='tree'>
                        {visibleNodes.map((entry, index) => renderTreeItem(entry, index))}
                    </div>
                )}
            </div>
        </aside>
    );
};

export default ThemeFileTree;
