import React from 'react';
import {Save, X} from 'lucide-react';
import {ghostButtonClass, primaryButtonClass} from './theme-editor-styles';
import type {ThemeChange} from './theme-editor-utils';

type ThemeEditorToolbarProps = {
    currentThemeName: string;
    changes: ThemeChange[];
    isSaving: boolean;
    onOpenReview: () => void;
    onClose: () => void;
    onSave: () => void;
};

const ThemeEditorToolbar: React.FC<ThemeEditorToolbarProps> = ({
    currentThemeName,
    changes,
    isSaving,
    onOpenReview,
    onClose,
    onSave
}) => {
    return (
        <div className='flex items-center gap-3 border-b border-[#23262c] bg-[#1a1d21] px-4 py-3'>
            <div className='flex min-w-0 items-baseline gap-2'>
                <h2 className='truncate text-[14px] font-semibold text-[#f4f5f7]'>Edit theme</h2>
                <span className='truncate text-[12px] text-[#8a8f98]'>{currentThemeName}</span>
            </div>
            {changes.length > 0 && (
                <button
                    className='rounded-full border border-transparent bg-[#3b2a16] px-2.5 py-1 text-[11px] leading-none text-[#f5a623] hover:bg-[#49311a]'
                    type='button'
                    onClick={onOpenReview}
                >
                    {changes.length} {changes.length === 1 ? 'file modified' : 'files modified'}
                </button>
            )}
            <div className='grow' />
            <button className={ghostButtonClass} type='button' onClick={onClose}>
                <X size={14} />
                Close
            </button>
            <button className={primaryButtonClass} disabled={isSaving} type='button' onClick={onSave}>
                <Save size={14} />
                {isSaving ? 'Saving…' : 'Save'}
            </button>
        </div>
    );
};

export default ThemeEditorToolbar;
