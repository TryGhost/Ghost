import {Comment, OpenCommentForm, useAppContext} from '../../../AppContext';
import {Form, FormWrapper} from './Form';
import {isMobile, scrollToElement} from '../../../utils/helpers';
import {useCallback, useMemo} from 'react';
import {useEditor} from '../../../utils/hooks';
import {useRefCallback} from '../../../utils/hooks';

type Props = {
    openForm: OpenCommentForm;
    parent: Comment;
}

const ReplyForm: React.FC<Props> = ({openForm, parent}) => {
    const {postId, dispatchAction, t} = useAppContext();
    const [, setForm] = useRefCallback<HTMLDivElement>(scrollToElement);

    const config = useMemo(() => ({
        placeholder: t('Reply to comment'),
        autofocus: true
    }), []);

    const {editor} = useEditor(config);

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
            <div className='mt-[-16px] pr-2'>
                <FormWrapper comment={parent} editor={editor} isOpen={true} openForm={openForm} reduced={isMobile()}>
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
