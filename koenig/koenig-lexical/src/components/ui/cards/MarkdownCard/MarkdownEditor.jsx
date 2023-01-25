import React, {useRef, useEffect, useLayoutEffect, useState} from 'react';
import SimpleMDE from '@tryghost/kg-simplemde';
import MarkdownHelpDialog from './MarkdownHelpDialog';
import MarkdownImageUploader from './MarkdownImageUploader';
import UnsplashModal from '../../UnsplashModal';

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
    const editor = useRef(null);
    const [isHelpDialogOpen, setHelpDialogOpen] = useState(false);
    const [isUnsplashDialogOpen, setUnsplashDialogOpen] = useState(false);
    const {
        openImageUploadDialog,
        uploadImages,
        captureSelection,
        insertUnsplashImage,
        imageInputRef,
        progress,
        errors: imageUploadErrors,
        isLoading,
        filesNumber
    } = useMarkdownImageUploader(editor, imageUploader);

    // init editor on component mount
    useLayoutEffect(() => {
        editor.current = new SimpleMDE({
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
                drawImage: null
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
                    title: 'Upload Image(s)'
                },
                {
                    name: 'unsplash',
                    action: openUnsplashDialog,
                    className: 'fa fa-camera',
                    title: 'Add Image from Unsplash'
                },
                '|',
                {
                    name: 'spellcheck',
                    action: toggleSpellcheck,
                    className: 'fa fa-check active',
                    title: 'Spellcheck (Ctrl-Alt-S)',
                    useCtrlOnMac: true
                },
                {
                    name: 'guide',
                    action: openHelpDialog,
                    className: 'fa fa-question-circle',
                    title: 'Markdown Guide'
                }
            ]
        });

        const editorInstance = editor.current;

        editorInstance.value(markdown ?? '');

        editorInstance.codemirror.on('change', (instance, changeObj) => {
            // avoid a "modified x twice in a single render" error that occurs
            // when the underlying value is completely swapped out
            if (changeObj.origin !== 'setValue') {
                updateMarkdown(editor.current.value());
            }
        });

        if (autofocus) {
            editorInstance.codemirror.execCommand('goDocEnd');
        }

        // Prevents the editor from losing focus when double clicking inside
        editorInstance.codemirror.on('mousedown', (instance, event) => {
            event.stopPropagation();
        });

        // remove editor on unmount
        return () => {
            editor.current.toTextArea();
        };
    }, []);

    // update the editor when the value property changes from the outside
    useEffect(() => {
        // compare values before forcing a content reset to avoid clobbering the undo behaviour
        if (markdown !== editor.current.value()) {
            let cursor = editor.current.codemirror.getDoc().getCursor();
            editor.current.value(markdown);
            editor.current.codemirror.getDoc().setCursor(cursor);
        }
    }, [markdown]);

    function toggleSpellcheck() {
        let codemirror = editor.current.codemirror;

        if (codemirror.getOption('mode') === 'spell-checker') {
            codemirror.setOption('mode', 'gfm');
        } else {
            codemirror.setOption('mode', 'spell-checker');
        }

        toggleButtonClass();
    }

    function toggleButtonClass() {
        let spellcheckButton = editor.current.toolbarElements.spellcheck;

        if (spellcheckButton) {
            if (editor.current.codemirror.getOption('mode') === 'spell-checker') {
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
    }

    function getListOfHiddenIcons() {
        let icons = [];

        if (!unsplashConf) {
            icons.push('unsplash');
        }

        return icons;
    }

    function openUnsplashDialog() {
        captureSelection();
        setUnsplashDialogOpen(true);
    }

    function closeUnsplashDialog() {
        setUnsplashDialogOpen(false);
    }

    function onUnsplashInsert(img) {
        insertUnsplashImage(img);
        closeUnsplashDialog();
    }

    return (
        <div className="not-kg-prose">
            <textarea ref={editorRef}></textarea>

            <MarkdownHelpDialog
                onClose={closeHelpDialog}
                isOpen={isHelpDialogOpen}
            />

            <MarkdownImageUploader
                inputRef={imageInputRef}
                onChange={uploadImages}
                progress={progress}
                loading={isLoading}
                errors={imageUploadErrors}
                filesNumber={filesNumber}
            />

            {isUnsplashDialogOpen && (
                <UnsplashModal
                    onClose={closeUnsplashDialog}
                    onImageInsert={onUnsplashInsert}
                    unsplashConf={unsplashConf}
                />
            )}
        </div>
    );
}
