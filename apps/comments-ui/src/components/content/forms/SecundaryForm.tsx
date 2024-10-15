import Form, {SubmitSize} from './Form';
import {Editor} from '@tiptap/react';
import {isMobile} from '../../../utils/helpers';
import {useAppContext} from '../../../AppContext';
import {useEffect, useState} from 'react';
import {useSecondUpdate} from '../../../utils/hooks';

type Props = {
    editor: Editor;
    submit: (data: {html: string}) => Promise<void>;
    close: () => void;
    closeIfNotChanged: () => void;
    submitText: JSX.Element;
    submitSize: SubmitSize;
};

const SecundaryForm: React.FC<Props> = ({editor, submit, close, closeIfNotChanged, submitText, submitSize}) => {
    const {dispatchAction, secundaryFormCount} = useAppContext();
    const [hasContent, setHasContent] = useState(false);

    // Keep track of the amount of open forms
    useEffect(() => {
        dispatchAction('increaseSecundaryFormCount', {});
        return () => {
            dispatchAction('decreaseSecundaryFormCount', {});
        };
    }, [dispatchAction]);

    useSecondUpdate(() => {
        // We use useSecondUpdate because:
        // first call is the mounting of the form
        // second call is the increaseSecundaryFormCount from our own
        // third call means a different SecondaryForm is mounted or unmounted, and we need to close if not changed

        if (secundaryFormCount > 1) {
            closeIfNotChanged();
        };
    }, [secundaryFormCount]);

    useEffect(() => {
        if (editor) {
            const checkContent = () => {
                setHasContent(!editor.isEmpty);
            };
            editor.on('update', checkContent);
            editor.on('transaction', checkContent);
            
            checkContent();

            return () => {
                editor.off('update', checkContent);
                editor.off('transaction', checkContent);
            };
        }
    }, [editor]);

    const reduced = isMobile();

    return (
        <div className='mt-[-16px] pr-3'>
            <Form 
                close={close} 
                editor={editor} 
                hasContent={hasContent} 
                isOpen={true} 
                reduced={reduced} 
                submit={submit} 
                submitSize={submitSize} 
                submitText={submitText}
            />
        </div>
    );
};

export default SecundaryForm;
