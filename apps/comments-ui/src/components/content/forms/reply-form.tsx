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

    // The quote present when the form first opens is seeded as the editor's
    // initial content (below) rather than inserted after mount. Inserting post-
    // mount races the editor's async creation on mobile — the form opens but the
    // quote is dropped, forcing a second tap. Seeding makes it part of the
    // document at creation, so it's there in a single action. Captured once via
    // a ref so re-renders don't change it.
    const initialQuote = useRef(openForm.pendingQuote);
    // The seeded quote counts as already inserted; the effect below only handles
    // subsequent re-quotes into an already-open (already-mounted) editor.
    const insertedQuoteId = useRef<string | null>(initialQuote.current?.id ?? null);

    const config = useMemo(() => ({
        placeholder: t('Reply to comment'),
        // Seed the opening quote as initial content so it exists at editor
        // creation (see initialQuote above). Empty for plain reply forms.
        content: initialQuote.current ? `<blockquote>${initialQuote.current.html}</blockquote><p></p>` : '',
        // TipTap's autofocus fires from a setTimeout after editor creation and
        // rewrites the editor selection into the DOM, racing (and stealing) a
        // text selection the user makes right after a quote form opens. Quote
        // forms focus via the effect below instead; plain reply forms keep
        // autofocus. (On iOS neither raises the keyboard — the editor is created
        // after the tap's gesture window closes — but desktop focuses either way.)
        autofocus: !openForm.pendingQuote
    }), []);

    const {editor} = useEditor(config);

    useEffect(() => {
        // Focus after a seeded quote (cursor in the trailing paragraph) once the
        // editor exists. A direct focus() avoids TipTap autofocus's deferred
        // selection-steal; autofocus is disabled for quote forms above.
        if (!editor || !initialQuote.current) {
            return;
        }

        editor.commands.focus('end');
    }, [editor]);

    useEffect(() => {
        if (!editor || !openForm.pendingQuote || insertedQuoteId.current === openForm.pendingQuote.id) {
            return;
        }

        insertedQuoteId.current = openForm.pendingQuote.id;

        // Re-quoting into an already-open form: the editor already exists, so
        // inserting here is race-free (the first quote is seeded as initial
        // content above). insertContent parses against the editor schema, leaves
        // the cursor in the trailing paragraph, and counts as content so the form
        // reports unsaved changes (see form.tsx checkContent) and isn't auto-closed.
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
