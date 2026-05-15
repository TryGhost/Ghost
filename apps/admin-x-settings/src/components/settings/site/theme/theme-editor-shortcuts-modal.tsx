import React, {useEffect, useRef} from 'react';
import {X} from 'lucide-react';
import {iconButtonClass} from './theme-editor-styles';

type Shortcut = {
    keys: string[];
    description: string;
};

type ShortcutSection = {
    title: string;
    shortcuts: Shortcut[];
};

const SHORTCUT_SECTIONS: ShortcutSection[] = [
    {
        title: 'Global',
        shortcuts: [
            {keys: ['⌘/Ctrl', 'S'], description: 'Save and upload theme'},
            {keys: ['Esc'], description: 'Close editor (prompts if unsaved)'},
            {keys: ['?'], description: 'Show keyboard shortcuts'}
        ]
    },
    {
        title: 'File tree',
        shortcuts: [
            {keys: ['↑', '↓'], description: 'Move selection'},
            {keys: ['→'], description: 'Expand folder or move to first child'},
            {keys: ['←'], description: 'Collapse folder or move to parent'},
            {keys: ['Enter'], description: 'Open file or toggle folder'},
            {keys: ['Space'], description: 'Open file or toggle folder'},
            {keys: ['F2'], description: 'Rename selected file or folder'},
            {keys: ['Del'], description: 'Delete selected file or folder'}
        ]
    }
];

const kbdClass = 'inline-flex min-w-[26px] items-center justify-center rounded border border-[#2f333b] bg-[#1a1d21] px-1.5 py-0.5 text-[11px] font-medium text-[#e6e7ea]';

type Props = {
    onClose: () => void;
};

const ThemeEditorShortcutsModal: React.FC<Props> = ({onClose}) => {
    const closeButtonRef = useRef<HTMLButtonElement>(null);

    useEffect(() => {
        closeButtonRef.current?.focus();
    }, []);

    const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
        // Element-level handler so the editor's own window-capture Esc
        // listener doesn't swallow this. Stop propagation to keep the
        // dialog dismissable without also triggering the editor's
        // close-with-discard flow.
        if (event.key === 'Escape') {
            event.preventDefault();
            event.stopPropagation();
            onClose();
        }
    };

    return (
        <div
            aria-label='Keyboard shortcuts'
            aria-modal='true'
            className='absolute inset-0 z-20 flex items-center justify-center bg-[rgba(8,10,14,0.64)]'
            role='dialog'
            onClick={onClose}
            onKeyDown={onKeyDown}
        >
            <div
                className='flex max-h-[min(80vh,640px)] w-[min(560px,calc(100%-24px))] flex-col overflow-hidden rounded-[10px] border border-[#2b3038] bg-[#171a20] p-5 shadow-[0_24px_64px_rgba(0,0,0,0.45)]'
                data-testid='theme-editor-shortcuts-modal'
                onClick={event => event.stopPropagation()}
            >
                <div className='mb-3 flex items-center justify-between gap-3'>
                    <h3 className='text-[16px] font-semibold text-[#f4f5f7]'>Keyboard shortcuts</h3>
                    <button ref={closeButtonRef} aria-label='Close keyboard shortcuts' className={iconButtonClass} type='button' onClick={onClose}>
                        <X size={14} />
                    </button>
                </div>
                <div className='min-h-0 flex-1 space-y-4 overflow-y-auto pr-1'>
                    {SHORTCUT_SECTIONS.map(section => (
                        <section key={section.title}>
                            <h4 className='mb-2 text-[11px] font-semibold tracking-[0.08em] text-[#8a8f98] uppercase'>{section.title}</h4>
                            <ul className='space-y-1.5'>
                                {section.shortcuts.map(shortcut => (
                                    <li key={shortcut.description} className='flex items-center justify-between gap-4 rounded-md border border-transparent px-2 py-1 text-[13px] text-[#d4d8de]'>
                                        <span>{shortcut.description}</span>
                                        <span className='flex shrink-0 items-center gap-1'>
                                            {shortcut.keys.map((key, index) => (
                                                <React.Fragment key={key}>
                                                    {index > 0 && <span className='text-[11px] text-[#6a6f78]'>+</span>}
                                                    <kbd className={kbdClass}>{key}</kbd>
                                                </React.Fragment>
                                            ))}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        </section>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default ThemeEditorShortcutsModal;
