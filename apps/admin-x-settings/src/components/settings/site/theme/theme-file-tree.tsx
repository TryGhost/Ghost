import React from 'react';
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
                    onClick={() => onOpenFile(node.path)}
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
    );
};

export default ThemeFileTree;
