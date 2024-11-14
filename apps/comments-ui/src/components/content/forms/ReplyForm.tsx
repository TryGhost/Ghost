import Form from './Form';
import {Comment, OpenCommentForm, useAppContext} from '../../../AppContext';
import {getEditorConfig} from '../../../utils/editor';
import {isMobile, scrollToElement} from '../../../utils/helpers';
import {useCallback} from 'react';
import {useEditor} from '@tiptap/react';
import {useRefCallback} from '../../../utils/hooks';

type Props = {
    openForm: OpenCommentForm;
    parent: Comment;
}
const ReplyForm: React.FC<Props> = ({openForm, parent}) => {
    const {postId, dispatchAction, t} = useAppContext();
    const [, setForm] = useRefCallback<HTMLDivElement>(scrollToElement);

    const config = {
        placeholder: t('Reply to comment'),
        autofocus: true
    };

    const editor = useEditor({
        ...getEditorConfig(config)
    });

    const submit = useCallback(async ({html}) => {
        // Send comment to server
        await dispatchAction('addReply', {
            parent: parent,
            reply: {
                post_id: postId,
                status: 'published',
                html
            }
        });
    }, [parent, postId, dispatchAction]);

    const close = useCallback(() => {
        dispatchAction('closeCommentForm', openForm.id);
    }, [dispatchAction, openForm]);

    const SubmitText = (<>
        <span className="hidden sm:inline">{t('Add reply')}</span><span className="sm:hidden">{t('Reply')}</span>
    </>);

    return (
        <div ref={setForm}>
            <div className='mt-[-16px] pr-3'>
                <Form
                    close={close}
                    comment={parent}
                    editor={editor}
                    isOpen={true}
                    openForm={openForm}
                    reduced={isMobile()}
                    submit={submit}
                    submitSize={'medium'}
                    submitText={SubmitText}
                />
            </div>
        </div>
    );
};

export default ReplyForm;
