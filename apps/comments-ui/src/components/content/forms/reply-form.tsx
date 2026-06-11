import {Comment, OpenCommentForm, useAppContext} from '../../../app-context';
import {Form, FormWrapper} from './form';
import {isMobile, scrollToElement} from '../../../utils/helpers';
import {useCallback, useEffect, useMemo, useRef} from 'react';
import {useEditor} from '../../../utils/hooks';
import {useRefCallback} from '../../../utils/hooks';

type Props = {
    openForm: OpenCommentForm;
    parent: Comment;
    threadedLayout?: boolean;
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

        // insertContent parses against the editor schema (with the editor's
        // preserveWhitespace: 'full' parse options), replaces the empty paragraph
        // in place when the form is empty, and leaves the cursor in the trailing
        // paragraph. The inserted quote counts as content, so the form reports
        // unsaved changes (see form.tsx checkContent) and is never auto-closed.
        editor.chain()
            .focus()
            .insertContent(`<blockquote>${openForm.pendingQuote.html}</blockquote><p></p>`)
            .run();
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
