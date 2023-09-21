import {useCallback, useEffect, useState} from 'react';

export type Dirtyable<Data> = Data & {
    dirty?: boolean;
}

export type SaveState = 'unsaved' | 'saving' | 'saved' | 'error' | '';

export type ErrorMessages = Record<string, string | undefined>

export interface FormHook<State> {
    formState: State;
    saveState: SaveState;
    /**
     * Validate and save the state. Use the `force` option to save even when there are no changes made (e.g., initial state should be saveable)
     */
    handleSave: (options?: {force?: boolean}) => Promise<boolean>;
    /**
     * Update the form state and mark the form as dirty. Should be used in input events
     */
    updateForm: (updater: (state: State) => State) => void;
    /**
     * Update the form state without marking the form as dirty. Should be used for updating initial state after API responses
     */
    setFormState: (updater: (state: State) => State) => void;
    reset: () => void;

    validate: () => boolean;
    clearError: (field: string) => void;
    isValid: boolean;
    errors: ErrorMessages;
}

const useForm = <State>({initialState, onSave, onSaveError, onValidate}: {
    initialState: State,
    onSave: () => void | Promise<void>
    onSaveError?: (error: unknown) => void | Promise<void>
    onValidate?: () => ErrorMessages
}): FormHook<State> => {
    const [formState, setFormState] = useState(initialState);
    const [saveState, setSaveState] = useState<SaveState>('');
    const [errors, setErrors] = useState<ErrorMessages>({});

    // Reset saved state after 2 seconds
    useEffect(() => {
        if (saveState === 'saved') {
            setTimeout(() => {
                setSaveState(state => (state === 'saved' ? '' : state));
            }, 2000);
        }
    }, [saveState]);

    const isValid = (errs: ErrorMessages) => Object.values(errs).filter(Boolean).length === 0;

    const validate = () => {
        if (!onValidate) {
            return true;
        }

        const newErrors = onValidate();
        setErrors(newErrors);
        return isValid(newErrors);
    };

    // function to save the changed settings via API
    const handleSave = async (options: {force?: boolean} = {}) => {
        if (!validate()) {
            return false;
        }

        if (saveState !== 'unsaved' && !options.force) {
            return true;
        }

        setSaveState('saving');
        try {
            await onSave();
            setSaveState('saved');
            return true;
        } catch (e) {
            await onSaveError?.(e);
            setSaveState('unsaved');
            throw e;
        }
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
        },
        validate,
        isValid: isValid(errors),
        clearError: (field: string) => {
            setErrors(state => ({...state, [field]: ''}));
        },
        errors
    };
};

export default useForm;
