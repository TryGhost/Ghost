import {useEditor} from '@tiptap/react';
import {default as React, useCallback, useContext, useEffect} from 'react';
import AppContext from '../../../AppContext';
import {getEditorConfig} from '../../../utils/editor';
import SecundaryForm from './SecundaryForm';

const EditForm = ({comment, parent, close}) => {
    const {dispatchAction} = useContext(AppContext);

    const config = {
        placeholder: 'Edit this comment',
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
        submitText: 'Save',
        submitSize: 'small',
        submit
    };

    const closeIfNotChanged = useCallback(() => {
        if (editor?.getHTML() === comment.html) {
            close();
        }
    }, [editor, close, comment.html]);

    return (
        <SecundaryForm editor={editor} close={close} closeIfNotChanged={closeIfNotChanged} {...submitProps} />
    );
};

export default EditForm;
