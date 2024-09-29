import SecundaryForm from './SecundaryForm';
import {Comment, useAppContext} from '../../../AppContext';
import {getEditorConfig} from '../../../utils/editor';
import {useCallback, useEffect} from 'react';
import {useEditor} from '@tiptap/react';

type Props = {
    comment: Comment;
    parent?: Comment;
    close: () => void;
};

const EditForm: React.FC<Props> = ({comment, parent, close}) => {
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
    // // jump to end manually
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

    const submitProps = {
        submitText: t('Save'),
        submitSize: 'small',
        submit
    };

    const closeIfNotChanged = useCallback(() => {
        if (editor?.getHTML() === comment.html) {
            close();
        }
    }, [editor, close, comment.html]);

    return (
        <div className='px-3 pb-2 pt-3'>
            <SecundaryForm close={close} closeIfNotChanged={closeIfNotChanged} editor={editor} {...submitProps} />
        </div>
    );
};

export default EditForm;
