import {ButtonColor} from '@tryghost/admin-x-design-system';
import {useCallback, useEffect, useState} from 'react';

export type Dirtyable<Data> = Data & {
    dirty?: boolean;
}

export type SaveState = 'unsaved' | 'saving' | 'saved' | 'error' | '';

export type ErrorMessages = Record<string, string | undefined>

export interface OkProps {
    disabled: boolean;
    color: ButtonColor;
    label?: string;
}

export type SaveHandler = (options?: {force?: boolean; fakeWhenUnchanged?: boolean}) => Promise<boolean>

export interface FormHook<State> {
    formState: State;
    saveState: SaveState;
    /**
     * Validate and save the state. Use the `force` option to save even when there are no changes made (e.g., initial state should be saveable)
     */
    handleSave: SaveHandler;
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
    setErrors: (errors: ErrorMessages) => void;

    okProps: OkProps;
}

const useForm = <State>({initialState, savingDelay, savedDelay = 2000, onSave, onSaveError, onSavedStateReset: onSaveCompleted, onValidate}: {
    initialState: State;
    savingDelay?: number;
    savedDelay?: number;
    onSave: (state: State) => void | Promise<void>;
    onSaveError?: (error: unknown) => void | Promise<void>;
    onSavedStateReset?: () => void;
    onValidate?: (state: State) => ErrorMessages;
}): FormHook<State> => {
    const [formState, setFormState] = useState(initialState);
    const [saveState, setSaveState] = useState<SaveState>('');
    const [errors, setErrors] = useState<ErrorMessages>({});

    // Reset saved state after a delay
    // To prevent infinite renders, uses the value of onSaveCompleted from when the form was saved
    useEffect(() => {
        if (saveState === 'saved') {
            setTimeout(() => {
                onSaveCompleted?.();
                setSaveState(state => (state === 'saved' ? '' : state));
            }, savedDelay);
        }
    }, [saveState, savedDelay]); // eslint-disable-line react-hooks/exhaustive-deps

    const isValid = (errs: ErrorMessages) => Object.values(errs).filter(Boolean).length === 0;

    const validate = useCallback(
        () => {
            if (!onValidate) {
                return true;
            }

            const newErrors = onValidate(formState);
            setErrors(newErrors);
            return isValid(newErrors);
        },
        [formState, onValidate]
    );

    // function to save the changed settings via API
    const handleSave = useCallback<SaveHandler>(async (options = {}) => {
        if (!validate()) {
            setSaveState('error');
            return false;
        }

        if (saveState !== 'unsaved' && !options.force && !options.fakeWhenUnchanged) {
            return true;
        }

        const timeBefore = Date.now();

        setSaveState('saving');
        try {
            if (saveState === 'unsaved' || options.force) {
                await onSave(formState);
            }

            const duration = Date.now() - timeBefore;
            if (savingDelay && duration < savingDelay) {
                await new Promise((resolve) => {
                    setTimeout(resolve, savingDelay - duration);
                });
            }

            setSaveState('saved');

            return true;
        } catch (e) {
            await onSaveError?.(e);
            setSaveState('unsaved');
            throw e;
        }
    }, [formState, saveState, savingDelay, onSave, onSaveError, validate]);

    const updateForm = useCallback((updater: (state: State) => State) => {
        setFormState(updater);
        setSaveState('unsaved');
    }, []);

    let okColor: ButtonColor = 'black';
    if (saveState === 'saved') {
        okColor = 'green';
    } else if (saveState === 'error') {
        okColor = 'red';
    }

    let okLabel = '';
    if (saveState === 'saved') {
        okLabel = 'Saved';
    } else if (saveState === 'saving') {
        okLabel = 'Saving...';
    } else if (saveState === 'error') {
        okLabel = 'Retry';
    }

    const okProps: OkProps = {
        disabled: saveState === 'saving',
        color: okColor,
        label: okLabel || undefined
    };

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
        errors,
        setErrors,
        okProps
    };
};

export default useForm;
