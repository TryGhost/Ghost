import AppContext from '../../../AppContext';
import Form from './Form';
import React, {useCallback, useContext, useEffect, useRef} from 'react';
import {getEditorConfig} from '../../../utils/editor';
import {scrollToElement} from '../../../utils/helpers';
import {useEditor} from '@tiptap/react';

const MainForm = ({commentsCount}) => {
    const {postId, dispatchAction} = useContext(AppContext);

    const config = {
        placeholder: (commentsCount === 0 ? 'Start the conversation' : 'Join the discussion'),
        autofocus: false
    };

    const editor = useEditor({
        ...getEditorConfig(config)
    });

    const submit = useCallback(async ({html}) => {
        // Send comment to server
        await dispatchAction('addComment', {
            post_id: postId,
            status: 'published',
            html
        });
    }, [postId, dispatchAction]);

    // C keyboard shortcut to focus main form
    const formEl = useRef(null);

    useEffect(() => {
        if (!editor) {
            return;
        }

        // Add some basic keyboard shortcuts
        // ESC to blur the editor
        const keyDownListener = (event) => {
            if (!editor) {
                return;
            }

            if (event.metaKey || event.ctrlKey) {
                // CMD on MacOS or CTRL
                // Don't do anything
                return;
            }

            let focusedElement = document.activeElement;
            while (focusedElement && focusedElement.tagName === 'IFRAME') {
                if (!focusedElement.contentDocument) {
                    // CORS issue
                    // disable the C shortcut when we have a focused external iframe
                    break;
                }

                focusedElement = focusedElement.contentDocument.activeElement;
            }
            const hasInputFocused = focusedElement && (focusedElement.tagName === 'INPUT' || focusedElement.tagName === 'TEXTAREA' || focusedElement.tagName === 'IFRAME' || focusedElement.contentEditable === 'true');

            if (event.key === 'c' && !editor?.isFocused && !hasInputFocused) {
                editor?.commands.focus();

                if (formEl.current) {
                    scrollToElement(formEl.current);
                }
                return;
            }
        };

        // Note: normally we would need to attach this listener to the window + the iframe window. But we made listener
        // in the Iframe component that passes down all the keydown events to the main window to prevent that
        window.addEventListener('keydown', keyDownListener, {passive: true});

        return () => {
            window.removeEventListener('keydown', keyDownListener, {passive: true});
        };
    }, [editor]);

    const submitProps = {
        submitText: (
            <>
                <span className="hidden sm:inline">Add </span><span className="capitalize sm:normal-case">comment</span>
            </>
        ),
        submitSize: 'large',
        submit
    };

    const isOpen = editor?.isFocused ?? false;

    return (
        <div ref={formEl} className='mt-[-4px]' data-testid="main-form">
            <Form editor={editor} isOpen={isOpen} reduced={false} {...submitProps} />
        </div>
    );
};

export default MainForm;
