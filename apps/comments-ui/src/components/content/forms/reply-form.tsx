import {Comment, OpenCommentForm, useAppContext} from '../../../app-context';
import {Editor} from '@tiptap/react';
import {Form, FormWrapper} from './form';
import {TextSelection} from '@tiptap/pm/state';
import {isMobile, scrollToElement} from '../../../utils/helpers';
import {useCallback, useEffect, useMemo, useRef} from 'react';
import {useEditor} from '../../../utils/hooks';
import {useRefCallback} from '../../../utils/hooks';

type Props = {
    openForm: OpenCommentForm;
    parent: Comment;
    threadedLayout?: boolean;
}

function findCursorMarkerPosition(editor: Editor, marker: string) {
    let markerPosition: number | null = null;

    editor.state.doc.descendants((node, position) => {
        if (markerPosition !== null) {
            return false;
        }

        if (node.isText) {
            const markerIndex = node.text?.indexOf(marker) ?? -1;

            if (markerIndex > -1) {
                markerPosition = position + markerIndex;
                return false;
            }
        }

        return true;
    });

    return markerPosition;
}

function removeCursorMarker(editor: Editor, marker: string) {
    const markerPosition = findCursorMarkerPosition(editor, marker);

    if (markerPosition === null) {
        return null;
    }
    const transaction = editor.state.tr.delete(markerPosition, markerPosition + marker.length);
    transaction.setSelection(TextSelection.create(transaction.doc, markerPosition));
    editor.view.dispatch(transaction);

    return markerPosition;
}

const ReplyForm: React.FC<Props> = ({openForm, parent, threadedLayout = false}) => {
    const {postId, dispatchAction, t} = useAppContext();
    const [, setForm] = useRefCallback<HTMLDivElement>(scrollToElement);
    const insertedQuoteId = useRef<string | null>(null);

    const config = useMemo(() => ({
        placeholder: t('Reply to comment'),
        autofocus: true
    }), []);

    const {editor} = useEditor(config);

    useEffect(() => {
        if (!editor || !openForm.pendingQuote || insertedQuoteId.current === openForm.pendingQuote.id) {
            return;
        }

        insertedQuoteId.current = openForm.pendingQuote.id;
        const cursorMarker = `GHOST_QUOTE_CURSOR_${openForm.pendingQuote.id}`;
        const ownerWindow = editor.view.dom.ownerDocument.defaultView || window;

        editor.chain().focus().insertContent(`<blockquote>${openForm.pendingQuote.html}</blockquote><p>${cursorMarker}</p>`).run();
        const cursorPosition = removeCursorMarker(editor, cursorMarker);

        // TipTap can resolve selection backwards from the inserted blockquote.
        // Reapply the exact trailing paragraph cursor position after focus settles.
        ownerWindow.requestAnimationFrame(() => {
            ownerWindow.setTimeout(() => {
                if (editor.isDestroyed || cursorPosition === null) {
                    return;
                }

                editor.view.dispatch(
                    editor.state.tr.setSelection(TextSelection.create(editor.state.doc, cursorPosition))
                );
                editor.view.focus();
            }, 0);
        });
    }, [editor, openForm.pendingQuote]);

    const submit = useCallback(async ({html}) => {
        // Send comment to server
        await dispatchAction('addReply', {
            parent: parent,
            reply: {
                post_id: postId,
                in_reply_to_id: openForm.in_reply_to_id,
                status: 'published',
                html
            }
        });
    }, [parent, postId, openForm, dispatchAction]);

    const close = useCallback(() => {
        dispatchAction('closeCommentForm', openForm.id);
    }, [dispatchAction, openForm]);

    const SubmitText = (<>
        <span className="hidden sm:inline">{t('Add reply')}</span><span className="sm:hidden">{t('Reply')}</span>
    </>);

    return (
        <div ref={setForm} data-testid="reply-form">
            <div className={`${threadedLayout ? '' : 'mt-[-16px]'} pr-2`}>
                <FormWrapper editor={editor} isOpen={true} openForm={openForm} reduced={isMobile()} threadedLayout={threadedLayout}>
                    <Form
                        close={close}
                        editor={editor}
                        isOpen={true}
                        openForm={openForm}
                        reduced={isMobile()}
                        submit={submit}
                        submitSize={'medium'}
                        submitText={SubmitText}
                    />
                </FormWrapper>
            </div>
        </div>
    );
};

export default ReplyForm;
