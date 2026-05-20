import React, {useEffect, useState} from 'react';
import {CircleDot, Undo2, X} from 'lucide-react';
import {ghostButtonClass, iconButtonClass} from './theme-editor-styles';
import type {ThemeChange, ThemeEditorFile} from './theme-editor-utils';

const previewBlockClass = 'overflow-auto rounded-md border border-[#23262c] bg-[#15171a] p-4 text-[12px] leading-5 text-[#d4d8de]';
const previewSectionLabelClass = 'mb-2 text-[11px] font-semibold tracking-[0.08em] text-[#8a8f98] uppercase';
const previewEmptyStateClass = 'flex flex-1 items-center justify-center p-8 text-center text-[13px] text-[#6a6f78]';

export type ReviewItem = {
    path: string;
    editable: boolean;
    status: ThemeChange['status'];
    before: string | null;
    after: string | null;
};

export const buildReviewItems = ({
    baseFiles,
    currentFiles,
    changes
}: {
    baseFiles: Record<string, ThemeEditorFile>;
    currentFiles: Record<string, ThemeEditorFile>;
    changes: ThemeChange[];
}): ReviewItem[] => {
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

type ThemeReviewModalProps = {
    reviewItems: ReviewItem[];
    onClose: () => void;
    onOpenInEditor: (path: string) => void;
    onRevert: (path: string) => void;
};

const ThemeReviewModal: React.FC<ThemeReviewModalProps> = ({
    reviewItems,
    onClose,
    onOpenInEditor,
    onRevert
}) => {
    const [selectedReviewPath, setSelectedReviewPath] = useState<string | null>(null);
    const selectedReviewItem = reviewItems.find(item => item.path === selectedReviewPath) || reviewItems[0] || null;

    // Keep selectedReviewPath valid as reviewItems change. If the currently
    // selected path was reverted (and so dropped out of reviewItems), or if
    // nothing is selected yet, fall back to the first remaining item.
    useEffect(() => {
        if (!selectedReviewItem) {
            setSelectedReviewPath(null);
            return;
        }

        if (!selectedReviewPath || !reviewItems.some(item => item.path === selectedReviewPath)) {
            setSelectedReviewPath(selectedReviewItem.path);
        }
    }, [reviewItems, selectedReviewItem, selectedReviewPath]);

    const reviewSummary = formatReviewSummary(reviewItems);

    return (
        <div className='absolute inset-0 z-10 flex items-center justify-center bg-[rgba(8,10,14,0.64)]' onClick={onClose}>
            <div className='flex h-[min(78vh,calc(100%-24px))] w-[min(1240px,calc(100%-24px))] flex-col overflow-hidden rounded-[10px] border border-[#2b3038] bg-[#171a20] p-4 shadow-[0_24px_64px_rgba(0,0,0,0.45)]' onClick={event => event.stopPropagation()}>
                <div className='mb-2 flex items-center justify-between gap-3'>
                    <div>
                        <h3 className='text-[16px] font-semibold text-[#f4f5f7]'>All changes</h3>
                        <p className='mt-1 text-[12px] text-[#9aa0aa]'>{reviewSummary}</p>
                    </div>
                    <button aria-label='Close review' className={iconButtonClass} type='button' onClick={onClose}>
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
                                        <button className={ghostButtonClass} type='button' onClick={() => onOpenInEditor(selectedReviewItem.path)}>
                                            Open in editor
                                        </button>
                                    )}
                                    <button className={ghostButtonClass} type='button' onClick={() => onRevert(selectedReviewItem.path)}>
                                        <Undo2 size={14} />
                                        Revert
                                    </button>
                                </div>

                                {!selectedReviewItem.editable ? (
                                    <div className={previewEmptyStateClass}>
                                        Binary files are kept intact in the archive. Open or revert the change from here, but binary contents are not shown.
                                    </div>
                                ) : selectedReviewItem.status === 'added' ? (
                                    <div className='min-h-0 flex-1 overflow-auto p-4'>
                                        <div className={previewSectionLabelClass}>After</div>
                                        <pre className={previewBlockClass}>{selectedReviewItem.after ?? ''}</pre>
                                    </div>
                                ) : selectedReviewItem.status === 'deleted' ? (
                                    <div className='min-h-0 flex-1 overflow-auto p-4'>
                                        <div className={previewSectionLabelClass}>Before</div>
                                        <pre className={previewBlockClass}>{selectedReviewItem.before ?? ''}</pre>
                                    </div>
                                ) : (
                                    <div className='grid min-h-0 flex-1 grid-cols-2 gap-4 p-4'>
                                        <div className='min-h-0 overflow-auto'>
                                            <div className={previewSectionLabelClass}>Before</div>
                                            <pre className={`h-full ${previewBlockClass}`}>{selectedReviewItem.before ?? ''}</pre>
                                        </div>
                                        <div className='min-h-0 overflow-auto'>
                                            <div className={previewSectionLabelClass}>After</div>
                                            <pre className={`h-full ${previewBlockClass}`}>{selectedReviewItem.after ?? ''}</pre>
                                        </div>
                                    </div>
                                )}
                            </>
                        ) : (
                            <div className={previewEmptyStateClass}>
                                Select a changed file to review it.
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ThemeReviewModal;
