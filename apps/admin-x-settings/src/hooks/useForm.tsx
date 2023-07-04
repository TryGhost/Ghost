import {useCallback, useEffect, useState} from 'react';

export type Dirtyable<Data> = Data & {
    dirty?: boolean;
}

export type SaveState = 'unsaved' | 'saving' | 'saved' | 'error' | '';

export interface FormHook<State> {
    formState: State;
    saveState: SaveState;
    handleSave: () => Promise<void>;
    /**
     * Update the form state and mark the form as dirty. Should be used in input events
     */
    updateForm: (updater: (state: State) => State) => void;
    /**
     * Update the form state without marking the form as dirty. Should be used for updating initial state after API responses
     */
    setFormState: (updater: (state: State) => State) => void;
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

    const updateForm = useCallback((updater: (state: State) => State) => {
        setFormState(updater);
        setSaveState('unsaved');
    }, []);

    return {
        formState,
        saveState,
        handleSave,
        updateForm,
        setFormState,
        reset() {
            setFormState(initialState);
            setSaveState('');
        }
    };
};

export default useForm;
