import React, {useCallback, useEffect, useMemo, useRef} from 'react';
import {Form, FormWrapper} from './Form';
import {scrollToElement} from '../../../utils/helpers';
import {useAppContext} from '../../../AppContext';
import {useEditor} from '../../../utils/hooks';

type Props = {
    commentsCount: number
};

const MainForm: React.FC<Props> = ({commentsCount}) => {
    const {postId, dispatchAction, t} = useAppContext();

    const editorConfig = useMemo(() => ({
        placeholder: (commentsCount === 0 ? t('Start the conversation') : t('Join the discussion')),
        autofocus: false
    }), [commentsCount]);

    const {editor, hasContent} = useEditor(editorConfig);

    const submit = useCallback(async ({html}) => {
        // Send comment to server
        await dispatchAction('addComment', {
            post_id: postId,
            status: 'published',
            html
        });

        editor?.commands.clearContent();
    }, [postId, dispatchAction, editor]);

    // C keyboard shortcut to focus main form
    const formEl = useRef(null);

    useEffect(() => {
        if (!editor) {
            return;
        }

        // Add some basic keyboard shortcuts
        // ESC to blur the editor
        const keyDownListener = (event: KeyboardEvent) => {
            if (!editor) {
                return;
            }

            if (event.metaKey || event.ctrlKey) {
                // CMD on MacOS or CTRL
                // Don't do anything
                return;
            }

            let focusedElement = document.activeElement as HTMLElement | null;
            while (focusedElement && focusedElement.tagName === 'IFRAME') {
                if (!(focusedElement as HTMLIFrameElement).contentDocument) {
                    // CORS issue
                    // disable the C shortcut when we have a focused external iframe
                    break;
                }

                focusedElement = ((focusedElement as HTMLIFrameElement).contentDocument?.activeElement ?? null) as HTMLElement | null;
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
            window.removeEventListener('keydown', keyDownListener, {passive: true} as any);
        };
    }, [editor]);

    const submitProps = {
        submitText: (
            <>
                <span className="hidden sm:inline">{t('Add comment')} </span><span className="sm:hidden">{t('Comment')}</span>
            </>
        ),
        submitSize: 'large' as const,
        submit
    };

    const isOpen = editor?.isFocused || hasContent;

    return (
        <div ref={formEl} className='px-3 pb-2 pt-3' data-testid="main-form">
            <FormWrapper editor={editor} isOpen={isOpen} reduced={false}>
                <Form
                    editor={editor}
                    isOpen={isOpen}
                    reduced={false}
                    {...submitProps}
                />
            </FormWrapper>
        </div>
    );
};

export default MainForm;
