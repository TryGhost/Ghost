import {Comment, OpenCommentForm, useAppContext} from '../../../app-context';
import {Editor} from '@tiptap/react';
import {Form, FormWrapper} from './form';
import {Fragment, DOMParser as ProseMirrorDOMParser, Slice} from '@tiptap/pm/model';
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

function createQuoteNode(editor: Editor, quoteHtml: string) {
    const ownerDocument = editor.view.dom.ownerDocument;
    const container = ownerDocument.createElement('div');
    container.innerHTML = quoteHtml;

    const content = ProseMirrorDOMParser.fromSchema(editor.schema).parseSlice(container, {preserveWhitespace: 'full'}).content;
    return editor.schema.nodes.blockquote.create(null, content);
}

function insertQuote(editor: Editor, quoteHtml: string) {
    const quoteNode = createQuoteNode(editor, quoteHtml);
    const paragraphNode = editor.schema.nodes.paragraph.create();
    const insertPosition = editor.state.selection.from;
    const quoteContent = new Slice(Fragment.fromArray([quoteNode, paragraphNode]), 0, 0);
    const transaction = editor.state.tr.replaceSelection(quoteContent);
    const cursorPosition = insertPosition + quoteNode.nodeSize + 1;

    transaction.setSelection(TextSelection.create(transaction.doc, cursorPosition));
    editor.view.dispatch(transaction);

    return cursorPosition;
}

const ReplyForm: React.FC<Props> = ({openForm, parent, threadedLayout = false}) => {
    const {postId, dispatchAction, t} = useAppContext();
    const [, setForm] = useRefCallback<HTMLDivElement>(scrollToElement);
    const insertedQuoteId = useRef<string | null>(null);

    const config = useMemo(() => ({
        placeholder: t('Reply to comment'),
        // TipTap's autofocus fires from a setTimeout after editor creation and
        // rewrites the editor selection into the DOM. For a quote-initiated form
        // the insertion effect below already focuses synchronously, so the
        // delayed autofocus would only race the user's next text selection and
        // steal it. Plain reply forms keep autofocus.
        autofocus: !openForm.pendingQuote
    }), []);

    const {editor} = useEditor(config);

    useEffect(() => {
        if (!editor || !openForm.pendingQuote || insertedQuoteId.current === openForm.pendingQuote.id) {
            return;
        }

        insertedQuoteId.current = openForm.pendingQuote.id;
        const ownerWindow = editor.view.dom.ownerDocument.defaultView || window;
        // Whether the form was empty *before* we insert the quote. Only an
        // otherwise-empty form may have its unsaved-changes baseline reset to the
        // quote: if the user already has a draft (e.g. they typed, then quoted a
        // second snippet), folding that draft into the baseline would mark it
        // "saved" and make it eligible for silent auto-close — losing their text.
        const wasEmpty = editor.isEmpty;

        editor.commands.focus();
        const cursorPosition = insertQuote(editor, openForm.pendingQuote.html);

        if (wasEmpty) {
            // Record the post-insertion HTML as the form's baseline so the
            // auto-inserted quote alone is not treated as an unsaved change (see
            // form.tsx checkContent). The form only becomes "dirty" once the user
            // types beyond the quote, which is what keeps it from being auto-closed.
            dispatchAction('setCommentFormInitialHtml', {id: openForm.id, initialHtml: editor.getHTML()});
        }

        // TipTap can resolve selection backwards from the inserted blockquote.
        // Reapply the exact trailing paragraph cursor position after focus settles.
        let timeoutId: number | null = null;
        const frameId = ownerWindow.requestAnimationFrame(() => {
            timeoutId = ownerWindow.setTimeout(() => {
                // Bail if the editor was torn down, or if the user edited the doc
                // down to before our target position (re-applying a stale,
                // out-of-range position makes TextSelection.create throw).
                if (editor.isDestroyed || cursorPosition > editor.state.doc.content.size) {
                    return;
                }

                // Bail if the document selection has left the editor in the
                // meantime (e.g. the user is already selecting their next quote):
                // the editor selection IS the document selection, so reapplying
                // would steal that in-progress selection.
                const domSelection = editor.view.dom.ownerDocument.getSelection();

                if (domSelection?.anchorNode && !editor.view.dom.contains(domSelection.anchorNode)) {
                    return;
                }

                editor.view.dispatch(
                    editor.state.tr.setSelection(TextSelection.create(editor.state.doc, cursorPosition))
                );
                editor.view.focus();
            }, 0);
        });

        // Cancel the deferred cursor placement if the form unmounts or the quote
        // changes before it runs, so it can't fire against a stale/destroyed editor.
        return () => {
            ownerWindow.cancelAnimationFrame(frameId);

            if (timeoutId !== null) {
                ownerWindow.clearTimeout(timeoutId);
            }
        };
    }, [dispatchAction, editor, openForm.id, openForm.pendingQuote]);

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
