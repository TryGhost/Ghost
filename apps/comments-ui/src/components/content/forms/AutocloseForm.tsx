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
const AutocloseForm: React.FC<Props> = ({editor, submit, close, closeIfNotChanged, submitText, submitSize}) => {
    const {dispatchAction, openFormCount} = useAppContext();

    // Keep track of the amount of open forms
    useEffect(() => {
        dispatchAction('increaseOpenFormCount', {});
        return () => {
            dispatchAction('decreaseOpenFormCount', {});
        };
    }, [dispatchAction]);

    useSecondUpdate(() => {
        // We use useSecondUpdate because:
        // first call is the mounting of the form
        // second call is the increaseOpenFormCount from our own
        // third call means a different AutocloseForm is mounted or unmounted, and we need to close if not changed

        if (openFormCount > 1) {
            closeIfNotChanged();
        };
    }, [openFormCount]);

    const reduced = isMobile();

    return (
        <div className='mt-[-16px] pr-3'>
            <Form
                close={close}
                editor={editor}
                isOpen={true}
                reduced={reduced}
                submit={submit}
                submitSize={submitSize}
                submitText={submitText}
            />
        </div>
    );
};

export default AutocloseForm;
