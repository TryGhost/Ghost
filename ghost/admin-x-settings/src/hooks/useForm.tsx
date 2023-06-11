import {useEffect, useState} from 'react';

export type SaveState = 'unsaved' | 'saving' | 'saved' | 'error' | '';

export interface FormHook<State> {
    formState: State;
    saveState: SaveState;
    handleSave: () => Promise<void>;
    updateForm: (updater: (state: State) => State) => void;
    reset: () => void;
}

const useForm = <State extends any>({initialState, onSave}: {
    initialState: State,
    onSave: () => void | Promise<void>
}): FormHook<State> => {
    const [formState, setFormState] = useState(initialState);
    const [saveState, setSaveState] = useState<SaveState>('');

    // Reset saved state after 2 seconds
    useEffect(() => {
        if (saveState === 'saved') {
            setTimeout(() => {
                setSaveState(state => (state === 'saved' ? '' : state));
            }, 2000);
        }
    }, [saveState]);

    // function to save the changed settings via API
    const handleSave = async () => {
        if (saveState !== 'unsaved') {
            return;
        }

        setSaveState('saving');
        await onSave();
        setSaveState('saved');
    };

    return {
        formState,
        saveState,
        handleSave,
        updateForm(updater) {
            setFormState(updater);
            setSaveState('unsaved');
        },
        reset() {
            setFormState(initialState);
            setSaveState('');
        }
    };
};

export default useForm;
