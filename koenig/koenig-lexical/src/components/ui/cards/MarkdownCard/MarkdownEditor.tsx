import MarkdownHelpDialog from './MarkdownHelpDialog';
import MarkdownImageUploader from './MarkdownImageUploader';
import SimpleMDE from '@tryghost/kg-simplemde';
import UnsplashModal from '../../file-selectors/UnsplashModal';
import {useLayoutEffect, useRef, useState} from 'react';

import ctrlOrCmd from '../../../../utils/ctrlOrCmd';
import useMarkdownImageUploader from './useMarkdownImageUploader';

interface CodeMirrorInstance {
    on(event: string, handler: (...args: unknown[]) => void): void;
    off(event: string, handler: (...args: unknown[]) => void): void;
    focus(): void;
    execCommand(command: string): void;
    getOption(name: string): unknown;
    setOption(name: string, value: unknown): void;
}

interface SimpleMDEInstance {
    value(val?: string): string;
    codemirror: CodeMirrorInstance;
    toTextArea(): void;
    toolbarElements: Record<string, HTMLElement>;
}

interface MarkdownEditorProps {
    markdown?: string;
    updateMarkdown?: (value: string) => void;
    imageUploader: (type: string) => unknown;
    unsplashConf?: unknown;
    autofocus?: boolean;
    placeholder?: string;
}

export default function MarkdownEditor({
    markdown,
    updateMarkdown,
    imageUploader,
    unsplashConf,
    autofocus = true,
    placeholder = ''
}: MarkdownEditorProps) {
    const editorRef = useRef<HTMLTextAreaElement>(null);
    const markdownEditor = useRef<SimpleMDEInstance | null>(null);
    const [isHelpDialogOpen, setHelpDialogOpen] = useState(false);
    const [isUnsplashDialogOpen, setUnsplashDialogOpen] = useState(false);
    const {
        openImageUploadDialog,
        uploadImages,
        insertUnsplashImage,
        imageInputRef,
        progress,
        errors: imageUploadErrors,
        isLoading,
        filesNumber
    } = useMarkdownImageUploader(markdownEditor as Parameters<typeof useMarkdownImageUploader>[0], imageUploader as Parameters<typeof useMarkdownImageUploader>[1]);

    const shortcuts = {
        openImageDialog: `${ctrlOrCmd}-Alt-I`,
        toggleSpellcheck: `${ctrlOrCmd}-Alt-S`,
        openUnsplashDialog: `${ctrlOrCmd}-Alt-O`
    };

    // init markdown editor on component mount
    useLayoutEffect(() => {
        markdownEditor.current = new SimpleMDE({
            element: editorRef.current,
            autofocus,
            indentWithTabs: false,
            placeholder,
            tabSize: 4,
            // disable shortcuts for side-by-side and fullscreen because they
            // trigger internal SimpleMDE methods that will result in broken
            // layouts
            shortcuts: {
                toggleFullScreen: null,
                togglePreview: null,
                toggleSideBySide: null,
                drawImage: null,

                // Enable strikethrough with CMD + Alt + U
                toggleStrikethrough: `${ctrlOrCmd}-Alt-U`
            },
            hideIcons: getListOfHiddenIcons(),
            // hide status bar
            status: [],
            // Ghost-specific SimpleMDE toolbar config - allows us to create a
            // bridge between SimpleMDE buttons and Ember actions
            toolbar: [
                'bold', 'italic', 'heading', '|',
                'quote', 'unordered-list', 'ordered-list', '|',
                'link',
                {
                    name: 'image',
                    action: openImageUploadDialog,
                    className: 'fa fa-picture-o',
                    title: `Upload Image(s) (${shortcuts.openImageDialog})`
                },
                {
                    name: 'unsplash',
                    action: openUnsplashDialog,
                    className: 'fa fa-camera',
                    title: `Add Image from Unsplash (${shortcuts.openUnsplashDialog})`
                },
                '|',
                {
                    name: 'spellcheck',
                    action: toggleSpellcheck,
                    className: 'fa fa-check',
                    title: `Spellcheck (${shortcuts.toggleSpellcheck})`
                },
                {
                    name: 'guide',
                    action: openHelpDialog,
                    className: 'fa fa-question-circle',
                    title: 'Markdown Guide'
                }
            ]
        });

        const editorInstance = markdownEditor.current;
        if (!editorInstance) {
            return;
        }

        editorInstance.value(markdown ?? '');

        editorInstance.codemirror.on('change', (_instance: unknown, changeObj: unknown) => {
            // avoid a "modified x twice in a single render" error that occurs
            // when the underlying value is completely swapped out
            if ((changeObj as {origin?: string}).origin !== 'setValue') {
                updateMarkdown?.(editorInstance.value());
            }
        });

        // add non-breaking space as a special char
        // control characters are intentional - this regex detects special chars for CodeMirror
        const specialCharsPattern = `[${String.fromCharCode(0)}-${String.fromCharCode(0x1f)}${String.fromCharCode(0x7f)}-${String.fromCharCode(0x9f)}\u00ad\u061c\u200b-\u200f\u2028\u2029\ufeff\xa0]`;
        editorInstance.codemirror.setOption('specialChars', new RegExp(specialCharsPattern, 'g'));

        if (autofocus) {
            editorInstance.codemirror.execCommand('goDocEnd');
        }

        // Prevents the editor from losing focus when double clicking inside
        editorInstance.codemirror.on('mousedown', (_instance: unknown, event: unknown) => {
            (event as MouseEvent).stopPropagation();
        });

        addShortcuts();

        // spellchecker turned off by default
        const codemirror = editorInstance.codemirror;
        codemirror.setOption('mode', 'gfm');

        // remove editor on unmount
        return () => {
            markdownEditor.current?.toTextArea();
        };

        // We only do this for init
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    function addShortcuts() {
        const codemirror = markdownEditor.current!.codemirror;

        const keys = (codemirror.getOption('extraKeys') as Record<string, unknown> | undefined) ?? {};

        keys[shortcuts.toggleSpellcheck] = toggleSpellcheck;
        keys[shortcuts.openImageDialog] = openImageUploadDialog;

        if (unsplashConf) {
            keys[shortcuts.openUnsplashDialog] = openUnsplashDialog;
        }
        // update shortcuts
        codemirror.setOption('extraKeys', keys);
    }

    function toggleSpellcheck() {
        const codemirror = markdownEditor.current!.codemirror;

        if (codemirror.getOption('mode') === 'spell-checker') {
            codemirror.setOption('mode', 'gfm');
        } else {
            codemirror.setOption('mode', 'spell-checker');
        }

        toggleButtonClass();
        codemirror.focus();
    }

    function toggleButtonClass() {
        const spellcheckButton = markdownEditor.current!.toolbarElements.spellcheck;

        if (spellcheckButton) {
            if (markdownEditor.current!.codemirror.getOption('mode') === 'spell-checker') {
                spellcheckButton.classList.add('active');
            } else {
                spellcheckButton.classList.remove('active');
            }
        }
    }

    function openHelpDialog() {
        setHelpDialogOpen(true);
    }

    function closeHelpDialog() {
        setHelpDialogOpen(false);
        markdownEditor.current!.codemirror.focus();
    }

    function getListOfHiddenIcons() {
        const icons: string[] = [];

        if (!unsplashConf) {
            icons.push('unsplash');
        }

        return icons;
    }

    function openUnsplashDialog() {
        setUnsplashDialogOpen(true);
    }

    function closeUnsplashDialog() {
        markdownEditor.current!.codemirror.focus();
        setUnsplashDialogOpen(false);
    }

    function onUnsplashInsert(img: {src: string; alt?: string; caption: string}) {
        insertUnsplashImage(img);
        setUnsplashDialogOpen(false);
    }

    return (
        <div className="not-kg-prose">
            <textarea ref={editorRef}></textarea>

            <MarkdownHelpDialog
                isOpen={isHelpDialogOpen}
                onClose={closeHelpDialog}
            />

            <MarkdownImageUploader
                errors={imageUploadErrors}
                filesNumber={filesNumber}
                inputRef={imageInputRef}
                loading={isLoading}
                progress={progress}
                onChange={uploadImages}
            />

            {isUnsplashDialogOpen && (
                <UnsplashModal
                    unsplashConf={unsplashConf}
                    onClose={closeUnsplashDialog}
                    onImageInsert={onUnsplashInsert as (image: unknown) => void}
                />
            )}
        </div>
    );
}
