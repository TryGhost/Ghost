import SecundaryForm from './SecundaryForm';
import {Comment, useAppContext} from '../../../AppContext';
import {getEditorConfig} from '../../../utils/editor';
import {scrollToElement} from '../../../utils/helpers';
import {useCallback} from 'react';
import {useEditor} from '@tiptap/react';
import {useRefCallback} from '../../../utils/hooks';

type Props = {
    parent: Comment;
    close: () => void;
}
const ReplyForm: React.FC<Props> = ({parent, close}) => {
    const {postId, dispatchAction} = useAppContext();
    const [, setForm] = useRefCallback<HTMLDivElement>(scrollToElement);

    const config = {
        placeholder: 'Reply to comment',
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

    const submitProps = {
        submitText: (
            <>
                <span className="hidden sm:inline">Add </span><span className="capitalize sm:normal-case">reply</span>
            </>
        ),
        submitSize: 'medium',
        submit
    };

    const closeIfNotChanged = useCallback(() => {
        if (editor?.isEmpty) {
            close();
        }
    }, [editor, close]);

    return (
        <div ref={setForm}>
            <SecundaryForm close={close} closeIfNotChanged={closeIfNotChanged} editor={editor} {...submitProps} />
        </div>
    );
};

export default ReplyForm;
