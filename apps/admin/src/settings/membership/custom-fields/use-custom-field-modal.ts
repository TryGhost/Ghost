import {
  type CustomFieldErrors,
  type CustomFieldValues,
  hasChanged,
  refusalErrors,
} from '@/shared/member-custom-fields/custom-field-values';
import { useForm, useHandleError } from '@tryghost/admin-x-framework/hooks';
import type { CustomFieldFormState } from '@/shared/member-custom-fields/custom-field-form-context';
import type { SettingsModalProps } from '@tryghost/shade/patterns';

type CustomFieldModalProps = Pick<
  SettingsModalProps,
  | 'buttonsDisabled'
  | 'dirty'
  | 'okLabel'
  | 'okVariant'
  | 'size'
  | 'stickyFooter'
  | 'testId'
  | 'onClose'
  | 'onOk'
>;

/**
 * A custom field form saved from a Settings modal: the form's state, and the modal's props for
 * saving it. Save checks the values with `validate` and sends them with `save`, then closes the
 * modal. A refusal from Ghost is shown beside the inputs it is about, or reported when it is about
 * none of them.
 */
export function useCustomFieldModal({
  start,
  validate,
  save,
  onClose,
}: {
  start: CustomFieldValues;
  validate: (values: CustomFieldValues) => CustomFieldErrors;
  save: (values: CustomFieldValues) => Promise<unknown>;
  onClose: () => void;
}): { state: CustomFieldFormState; modalProps: CustomFieldModalProps } {
  const handleError = useHandleError();
  const { formState, updateForm, handleSave, errors, setErrors, okProps, saveState } =
    useForm<CustomFieldValues>({
      initialState: start,
      savingDelay: 500,
      onValidate: validate,
      onSave: async (values) => {
        await save(values);
      },
      onSaveError: (error) => {
        const refused = refusalErrors(error, formState);
        if (refused) {
          setErrors(refused);
          return;
        }
        handleError(error);
      },
    });

  return {
    state: {
      values: formState,
      errors,
      saving: saveState === 'saving',
      update: updateForm,
      setErrors: (change) => setErrors(change(errors)),
    },
    modalProps: {
      buttonsDisabled: okProps.disabled,
      // Closing with edits asks first. Whether there are edits is judged by what the form asks
      // for rather than by the save state, which a save refused by validation sets to an error
      // while the edits are still there, and which stays unsaved after an edit is changed back.
      dirty: hasChanged(formState, start),
      okLabel: okProps.label || 'Save',
      okVariant: okProps.variant,
      size: 'sm',
      // A list's options can run long, so Save stays in reach.
      stickyFooter: true,
      testId: 'custom-field-modal',
      onClose,
      onOk: async () => {
        try {
          if (await handleSave()) {
            onClose();
          }
        } catch {
          // useForm has already passed the error to onSaveError.
        }
      },
    },
  };
}
