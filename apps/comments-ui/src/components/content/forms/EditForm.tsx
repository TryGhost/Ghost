import {Comment, OpenCommentForm, useAppContext} from '../../../AppContext';
import {Form} from './Form';
import {getEditorConfig} from '../../../utils/editor';
import {isMobile} from '../../../utils/helpers';
import {useCallback, useEffect} from 'react';
import {useEditor} from '@tiptap/react';

type Props = {
    openForm: OpenCommentForm;
    comment: Comment;
    parent?: Comment;
};

const EditForm: React.FC<Props> = ({comment, openForm, parent}) => {
    const {dispatchAction, t} = useAppContext();

    const config = {
        placeholder: t('Edit this comment'),
        // warning: we cannot use autofocus on the edit field, because that sets
        // the cursor position at the beginning of the text field instead of the end
        autofocus: false,
        content: comment.html
    };

    const editor = useEditor({
        ...getEditorConfig(config)
    });

    // Instead of autofocusing, we focus and jump to end manually
    useEffect(() => {
        if (!editor) {
            return;
        }

        editor
            .chain()
            .focus()
            .command(({tr, commands}) => {
                return commands.setTextSelection({
                    from: tr.doc.content.size,
                    to: tr.doc.content.size
                });
            })
            .run();
    }, [editor]);

    const submit = useCallback(async ({html}) => {
        // Send comment to server
        await dispatchAction('editComment', {
            comment: {
                id: comment.id,
                html
            },
            parent: parent
        });
    }, [parent, comment, dispatchAction]);

    const close = useCallback(() => {
        dispatchAction('closeCommentForm', openForm.id);
    }, [dispatchAction, openForm]);

    return (
        <div className="relative w-full">
            <Form
                close={close}
                comment={comment}
                editor={editor}
                isOpen={true}
                openForm={openForm}
                reduced={isMobile()}
                submit={submit}
                submitSize={'small'}
                submitText={t('Save')}
            />
        </div>
    );
};

export default EditForm;
