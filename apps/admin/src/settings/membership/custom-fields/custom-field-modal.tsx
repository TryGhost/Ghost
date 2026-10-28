import React from 'react';
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@tryghost/shade/components';
import { CustomFieldForm } from '@/shared/member-custom-fields/custom-field-form';
import { customFieldErrors, draftOf } from '@/shared/member-custom-fields/custom-field-draft';
import { LucideIcon } from '@tryghost/shade/utils';
import { SettingsModal } from '@tryghost/shade/patterns';
import { ValidationError, getErrorMessage } from '@tryghost/admin-x-framework/errors';
import { cleanListOptions } from '@/shared/member-custom-fields/list-options';
import {
  useCreateMemberCustomField,
  useDeleteMemberCustomField,
  useEditMemberCustomField,
  userTypeForFieldType,
} from '@tryghost/admin-x-framework/api/member-custom-fields';
import { toast } from 'sonner';
import { useConfirmation } from '@/settings/providers/confirmation-context';
import { useForm, useHandleError } from '@tryghost/admin-x-framework/hooks';
import type { MemberCustomField } from '@tryghost/admin-x-framework/api/member-custom-fields';

const CustomFieldModal: React.FC<{ field?: MemberCustomField; onClose: () => void }> = ({
  field,
  onClose,
}) => {
  const { confirm } = useConfirmation();
  const { mutateAsync: createField } = useCreateMemberCustomField();
  const { mutateAsync: editField } = useEditMemberCustomField();
  const { mutateAsync: deleteField } = useDeleteMemberCustomField();
  const handleError = useHandleError();
  const isEdit = field !== undefined;

  const { formState, updateForm, handleSave, errors, clearError, setErrors, okProps } = useForm({
    // The same draft every place a field is made from; its type maps to the API's on save.
    initialState: draftOf(field),
    savingDelay: 500,
    // Name uniqueness is enforced by the API (unique among custom fields); a 422 comes back
    // through onSaveError and highlights the field.
    onValidate: (state) => customFieldErrors(state),
    onSave: async (state) => {
      const isList = userTypeForFieldType(state.type).input === 'list';
      const options = cleanListOptions(state.options);
      if (field) {
        // Only the properties this form actually changed. Sending the whole field back
        // would carry whatever the list held when it was loaded, so saving a rename
        // would silently restore the access a colleague had changed in the meantime.
        const name = state.name.trim();
        const optionsChanged =
          isList && JSON.stringify(options) !== JSON.stringify(field.options ?? []);
        const multipleChanged = isList && state.multiple !== Boolean(field.multiple);
        await editField({
          key: field.key,
          ...(name === field.name ? {} : { name }),
          ...(state.access === field.access.member ? {} : { access: { member: state.access } }),
          ...(optionsChanged ? { options } : {}),
          ...(multipleChanged ? { multiple: state.multiple } : {}),
        });
      } else {
        // No key: the backend mints it from the name.
        await createField({
          name: state.name.trim(),
          type: state.type,
          access: { member: state.access },
          ...(isList ? { options, multiple: state.multiple } : {}),
        });
      }
    },
    onSaveError: (error) => {
      // A field-level validation error from the API highlights its input;
      // anything else falls back to a toast. The human-readable text lives
      // in `context` (Ghost's error handler rewrites `message` to a generic
      // "cannot save ..." summary), so read it via getErrorMessage.
      if (error instanceof ValidationError && error.data?.errors?.[0]?.property === 'name') {
        setErrors({ name: getErrorMessage(error, 'Invalid name') });
        return;
      }
      handleError(error);
    },
  });

  const isArchived = field?.status === 'archived';

  // The modal's third action mirrors the field's state: an active field can
  // be archived, an archived one reactivated. Both confirm first (the
  // newsletters pattern) — they change what every collection surface shows.
  const archiveButton = (
    <Button
      size="sm"
      type="button"
      variant="destructive-ghost"
      onClick={() => {
        onClose();
        confirm({
          title: 'Archive custom field',
          prompt: (
            <>
              <div className="mb-6">
                Your custom field <strong>{field!.name}</strong> will no longer show up on your
                members, collect new information, or appear in filters.
              </div>
              <div>Values already collected for this field will remain unchanged.</div>
            </>
          ),
          okLabel: 'Archive',
          okVariant: 'destructive',
          onOk: async (archiveModal) => {
            try {
              // Archiving is a status change over the same PUT a rename
              // uses; DELETE is the permanent, values-destroying removal
              // and only valid on an already-archived field.
              await editField({ key: field!.key, status: 'archived' });
              archiveModal?.remove();
              toast.success('Custom field archived');
            } catch (e) {
              toast.error('Failed to archive the custom field');
              handleError(e, { withToast: false });
            }
          },
        });
      }}
    >
      Archive
    </Button>
  );

  const reactivateButton = (
    <Button
      className="text-green hover:text-green"
      size="sm"
      type="button"
      variant="ghost"
      onClick={() => {
        onClose();
        confirm({
          title: 'Reactivate custom field',
          prompt: (
            <>
              <div className="mb-6">
                Reactivating <strong>{field!.name}</strong> will immediately make it available again
                on your members, for collecting, and in filters.
              </div>
              <div>Values already collected for this field will remain unchanged.</div>
              {field!.access.member !== 'none' && (
                <div className="mt-6">
                  This field is open to members, so what you have already collected becomes visible
                  to each of them on their own record.
                </div>
              )}
            </>
          ),
          okLabel: 'Reactivate',
          onOk: async (reactivateModal) => {
            try {
              await editField({ key: field!.key, status: 'active' });
              reactivateModal?.remove();
              toast.success('Custom field reactivated');
            } catch (e) {
              toast.error('Failed to reactivate the custom field');
              handleError(e, { withToast: false });
            }
          },
        });
      }}
    >
      Reactivate
    </Button>
  );

  let leftButton;
  if (isEdit) {
    leftButton = isArchived ? reactivateButton : archiveButton;
  }

  // Permanent deletion hides behind the header menu — one deliberate click
  // away, mirroring the members page's actions menu and the API's own
  // two-step (only archived fields can be deleted). A visible red button
  // would put irreversible data loss on equal footing with Save.
  const confirmDeleteField = () => {
    onClose();
    confirm({
      title: 'Delete custom field',
      prompt: (
        <>
          <strong>{field!.name}</strong> and every value collected from your members will be
          permanently deleted from the database. This can&rsquo;t be undone.
        </>
      ),
      okLabel: 'Delete',
      okVariant: 'destructive',
      onOk: async (deleteModal) => {
        try {
          await deleteField(field!.key);
          deleteModal?.remove();
          toast.success('Custom field deleted');
        } catch (e) {
          toast.error('Failed to delete the custom field');
          handleError(e, { withToast: false });
        }
      },
    });
  };

  const archivedFieldMenu = (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button aria-label="Menu" size="icon" type="button" variant="ghost">
          <LucideIcon.Ellipsis />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="z-[9999]">
        <DropdownMenuItem
          className="text-destructive focus:text-destructive"
          onSelect={confirmDeleteField}
        >
          <LucideIcon.Trash2 className="size-4" />
          Delete custom field
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <SettingsModal
      buttonsDisabled={okProps.disabled}
      cancelLabel={isEdit ? 'Close' : 'Cancel'}
      leftButton={leftButton}
      okLabel={okProps.label || 'Save'}
      okVariant={okProps.variant}
      size="sm"
      testId="custom-field-modal"
      title={isEdit ? 'Edit custom field' : 'Add custom field'}
      topRightContent={isArchived ? archivedFieldMenu : undefined}
      onClose={onClose}
      onOk={async () => {
        try {
          if (await handleSave()) {
            onClose();
          }
        } catch {
          // useForm has already passed the error to onSaveError, which
          // renders field validation or reports an unexpected failure.
        }
      }}
    >
      <div className="mt-10">
        <CustomFieldForm
          draft={formState}
          errors={{ name: errors.name, options: errors.options }}
          field={field}
          withVisibility
          onChange={(change) => updateForm((state) => ({ ...state, ...change }))}
          onClearError={clearError}
        />
      </div>
    </SettingsModal>
  );
};

export default CustomFieldModal;
