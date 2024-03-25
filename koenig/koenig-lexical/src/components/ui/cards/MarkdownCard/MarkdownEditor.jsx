import MarkdownHelpDialog from './MarkdownHelpDialog';
import MarkdownImageUploader from './MarkdownImageUploader';
import React, {useLayoutEffect, useRef, useState} from 'react';
import SimpleMDE from '@tryghost/kg-simplemde';
import UnsplashModal from '../../file-selectors/UnsplashModal';

import ctrlOrCmd from '../../../../utils/ctrlOrCmd';
import useMarkdownImageUploader from './useMarkdownImageUploader';

export default function MarkdownEditor({
    markdown,
    updateMarkdown,
    imageUploader,
    unsplashConf,
    autofocus = true,
    placeholder = ''
}) {
    const editorRef = useRef(null);
    const markdownEditor = useRef(null);
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
    } = useMarkdownImageUploader(markdownEditor, imageUploader);

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

        editorInstance.value(markdown ?? '');

        editorInstance.codemirror.on('change', (instance, changeObj) => {
            // avoid a "modified x twice in a single render" error that occurs
            // when the underlying value is completely swapped out
            if (changeObj.origin !== 'setValue') {
                updateMarkdown(markdownEditor.current.value());
            }
        });

        // add non-breaking space as a special char
        // eslint-disable-next-line no-control-regex
        editorInstance.codemirror.setOption('specialChars', /[\u0000-\u001f\u007f-\u009f\u00ad\u061c\u200b-\u200f\u2028\u2029\ufeff\xa0]/g);

        if (autofocus) {
            editorInstance.codemirror.execCommand('goDocEnd');
        }

        // Prevents the editor from losing focus when double clicking inside
        editorInstance.codemirror.on('mousedown', (instance, event) => {
            event.stopPropagation();
        });

        addShortcuts();

        // spellchecker turned off by default
        const codemirror = markdownEditor.current.codemirror;
        codemirror.setOption('mode', 'gfm');

        // remove editor on unmount
        return () => {
            markdownEditor.current.toTextArea();
        };

        // We only do this for init
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    function addShortcuts() {
        const codemirror = markdownEditor.current.codemirror;

        const keys = codemirror.getOption('extraKeys');

        keys[shortcuts.toggleSpellcheck] = toggleSpellcheck;
        keys[shortcuts.openImageDialog] = openImageUploadDialog;

        if (unsplashConf) {
            keys[shortcuts.openUnsplashDialog] = openUnsplashDialog;
        }
        // update shortcuts
        codemirror.setOption('extraKeys', keys);
    }

    function toggleSpellcheck() {
        let codemirror = markdownEditor.current.codemirror;

        if (codemirror.getOption('mode') === 'spell-checker') {
            codemirror.setOption('mode', 'gfm');
        } else {
            codemirror.setOption('mode', 'spell-checker');
        }

        toggleButtonClass();
        codemirror.focus();
    }

    function toggleButtonClass() {
        let spellcheckButton = markdownEditor.current.toolbarElements.spellcheck;

        if (spellcheckButton) {
            if (markdownEditor.current.codemirror.getOption('mode') === 'spell-checker') {
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
        markdownEditor.current.codemirror.focus();
    }

    function getListOfHiddenIcons() {
        let icons = [];

        if (!unsplashConf) {
            icons.push('unsplash');
        }

        return icons;
    }

    function openUnsplashDialog() {
        setUnsplashDialogOpen(true);
    }

    function closeUnsplashDialog() {
        markdownEditor.current.codemirror.focus();
        setUnsplashDialogOpen(false);
    }

    function onUnsplashInsert(img) {
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
                    onImageInsert={onUnsplashInsert}
                />
            )}
        </div>
    );
}
