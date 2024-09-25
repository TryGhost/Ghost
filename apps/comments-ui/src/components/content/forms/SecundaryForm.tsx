import Form, {SubmitSize} from './Form';
import {Editor} from '@tiptap/react';
import {isMobile} from '../../../utils/helpers';
import {useAppContext} from '../../../AppContext';
import {useEffect} from 'react';
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

    const reduced = isMobile();

    return (
        <div className='mt-[-28px] pr-3'>
            <Form close={close} editor={editor} isOpen={true} reduced={reduced} submit={submit} submitSize={submitSize} submitText={submitText} />
        </div>
    );
};

export default SecundaryForm;
