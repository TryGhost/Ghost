import { useCallback, useEffect, useRef, useState } from 'react';
import type { ButtonProps } from '@tryghost/shade/components';

export type ButtonVariant = NonNullable<ButtonProps['variant']>;

export type Dirtyable<Data> = Data & {
  dirty?: boolean;
};

export type SaveState = 'unsaved' | 'saving' | 'saved' | 'error' | '';

export type ErrorMessages = Record<string, string | undefined>;

export interface OkProps {
  disabled: boolean;
  variant: ButtonVariant;
  label?: string;
}

export type SaveHandler = (options?: {
  force?: boolean;
  fakeWhenUnchanged?: boolean;
}) => Promise<boolean>;

export interface FormHook<State> {
  formState: State;
  saveState: SaveState;
  /**
   * Validate and save the state. Use the `force` option to save even when there are no changes made (e.g., initial state should be saveable)
   * Returns false if validation fails, a save is already pending, or the form is edited or reset during the save.
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

const useForm = <State>({
  initialState,
  savingDelay,
  savedDelay = 2000,
  onSave,
  onSaveError,
  onSavedStateReset: onSaveCompleted,
  onValidate,
}: {
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
  const revision = useRef(0);
  const resetVersion = useRef(0);
  const saving = useRef(false);

  // Reset saved state after a delay
  // To prevent infinite renders, uses the value of onSaveCompleted from when the form was saved
  useEffect(() => {
    if (saveState === 'saved') {
      const savedRevision = revision.current;
      const timer = setTimeout(() => {
        if (revision.current !== savedRevision) {
          return;
        }
        onSaveCompleted?.();
        setSaveState((state) => (state === 'saved' ? '' : state));
      }, savedDelay);
      return () => clearTimeout(timer);
    }
  }, [saveState, savedDelay]);

  const isValid = (errs: ErrorMessages) => Object.values(errs).filter(Boolean).length === 0;

  const validate = useCallback(() => {
    if (!onValidate) {
      return true;
    }

    const newErrors = onValidate(formState);
    setErrors(newErrors);
    return isValid(newErrors);
  }, [formState, onValidate]);

  // function to save the changed settings via API
  const handleSave = useCallback<SaveHandler>(
    async (options = {}) => {
      if (saving.current) {
        return false;
      }

      if (!validate()) {
        setSaveState('error');
        return false;
      }

      if (saveState !== 'unsaved' && !options.force && !options.fakeWhenUnchanged) {
        return true;
      }

      const timeBefore = Date.now();
      const savedRevision = revision.current;
      const savedResetVersion = resetVersion.current;

      saving.current = true;
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

        if (resetVersion.current !== savedResetVersion) {
          return false;
        }

        const unchanged = revision.current === savedRevision;
        setSaveState(unchanged ? 'saved' : 'unsaved');
        return unchanged;
      } catch (e) {
        await onSaveError?.(e);
        if (resetVersion.current === savedResetVersion) {
          setSaveState('unsaved');
        }
        throw e;
      } finally {
        saving.current = false;
      }
    },
    [formState, saveState, savingDelay, onSave, onSaveError, validate],
  );

  const updateForm = useCallback((updater: (state: State) => State) => {
    revision.current += 1;
    setFormState(updater);
    setSaveState((state) => (state === 'saving' ? 'saving' : 'unsaved'));
  }, []);

  let okVariant: ButtonVariant = 'default';
  if (saveState === 'saved') {
    okVariant = 'default';
  } else if (saveState === 'error') {
    okVariant = 'destructive';
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
    variant: okVariant,
    label: okLabel || undefined,
  };

  return {
    formState,
    saveState,
    handleSave,
    updateForm,
    setFormState,
    reset() {
      revision.current += 1;
      resetVersion.current += 1;
      setFormState(initialState);
      setSaveState('');
    },
    validate,
    isValid: isValid(errors),
    clearError: (field: string) => {
      setErrors((state) => ({ ...state, [field]: '' }));
    },
    errors,
    setErrors,
    okProps,
  };
};

export default useForm;
