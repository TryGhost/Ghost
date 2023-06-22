import React, {useContext, useEffect} from 'react';
import AppContext from '../../../AppContext';
import {isMobile} from '../../../utils/helpers';
import {useSecondUpdate} from '../../../utils/hooks';
import Form from './Form';

const SecundaryForm = ({editor, submit, close, closeIfNotChanged, submitText, submitSize}) => {
    const {dispatchAction, secundaryFormCount} = useContext(AppContext);

    // Keep track of the amount of open forms
    useEffect(() => {
        dispatchAction('increaseSecundaryFormCount');

        return () => {
            dispatchAction('decreaseSecundaryFormCount');
        };
    }, [dispatchAction]);

    useSecondUpdate(() => {
        // We use useSecondUpdate because:
        // first call is the mounting of the form
        // second call is the increaseSecundaryFormCount from our own
        // third call means a different SecondaryForm is mounted or unmounted, and we need to close if not changed

        if (secundaryFormCount > 1) {
            closeIfNotChanged();
        }
    }, [secundaryFormCount]);

    const reduced = isMobile();

    return (
        <div className='-mt-[20px]'>
            <Form editor={editor} submit={submit} close={close} submitText={submitText} submitSize={submitSize} reduced={reduced} isOpen={true} />
        </div>
    );
};

export default SecundaryForm;
