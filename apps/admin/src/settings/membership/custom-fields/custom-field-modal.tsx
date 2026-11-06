import React from 'react';
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@tryghost/shade/components';
import {
  type CustomFieldDraft,
  customFieldDraftErrors,
  draftOf,
  isSettingsProblem,
  newCustomField,
  newDraft,
} from '@/shared/member-custom-fields/custom-field-draft';
import { CustomFieldForm } from '@/shared/member-custom-fields/custom-field-form';
import { LucideIcon } from '@tryghost/shade/utils';
import { SettingsModal } from '@tryghost/shade/patterns';
import {
  memberCustomFieldProblemsOf,
  memberCustomFieldUserTypes,
  useCreateMemberCustomField,
  useDeleteMemberCustomField,
  useEditMemberCustomField,
  userTypeForFieldType,
} from '@tryghost/admin-x-framework/api/member-custom-fields';
import { dequal } from 'dequal';
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

  // An edit shows the field's own type, which can't change.
  const offeredTypes = field ? [userTypeForFieldType(field.type)] : memberCustomFieldUserTypes;
  // What the form opened with, kept to tell whether anything has changed since.
  const [initialDraft] = React.useState(() =>
    field ? draftOf(field) : newDraft(offeredTypes[0].id),
  );

  const { formState, updateForm, handleSave, errors, clearError, setErrors, okProps, saveState } =
    useForm<CustomFieldDraft>({
      initialState: initialDraft,
      savingDelay: 500,
      // Name uniqueness is enforced by the API (unique among custom fields); a 422 comes back
      // through onSaveError and highlights the field.
      onValidate: (state) => ({ ...customFieldDraftErrors(state, field) }),
      onSave: async (state) => {
        if (field) {
          // Only the properties this form actually changed. Sending the whole field back
          // would carry whatever the list held when it was loaded, so saving a rename
          // would silently restore the access a colleague had changed in the meantime.
          const name = state.name.trim();
          // Settings are sent whole, and only when they change.
          const { settings } = state;
          const changes = {
            ...(name === field.name ? {} : { name }),
            ...(state.access === field.access.member ? {} : { access: { member: state.access } }),
            ...(settings && !dequal(settings, field.settings) ? { settings } : {}),
          };
          // An edit changed back to what was saved has nothing to send, and Ghost refuses an
          // empty one, so it saves as if nothing had been touched.
          if (Object.keys(changes).length === 0) {
            return;
          }
          await editField({ key: field.key, ...changes });
        } else {
          await createField(newCustomField(state));
        }
      },
      onSaveError: (error) => {
        // Ghost refusing something this form asks for shows beside the input that set it. Anything
        // else, such as a refusal of the request itself, is reported as an error.
        const problems = memberCustomFieldProblemsOf(error)?.filter(
          ({ property }) => property === 'name' || isSettingsProblem(property),
        );
        if (problems?.length) {
          setErrors(
            Object.fromEntries(problems.map(({ property, message }) => [property, message])),
          );
          return;
        }
        handleError(error);
      },
    });

  const isArchived = field?.status === 'archived';
  // Archiving and reactivating both ask for confirmation first, because each changes what every
  // surface that collects values shows.
  const archiveButton = (existing: MemberCustomField) => (
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
                Your custom field <strong>{existing.name}</strong> will no longer show up on your
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
              await editField({ key: existing.key, status: 'archived' });
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

  const reactivateButton = (existing: MemberCustomField) => (
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
                Reactivating <strong>{existing.name}</strong> will immediately make it available
                again on your members, for collecting, and in filters.
              </div>
              <div>Values already collected for this field will remain unchanged.</div>
              {existing.access.member !== 'none' && (
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
              await editField({ key: existing.key, status: 'active' });
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
  if (field) {
    leftButton = isArchived ? reactivateButton(field) : archiveButton(field);
  }

  // Permanent deletion hides behind the header menu — one deliberate click
  // away, mirroring the members page's actions menu and the API's own
  // two-step (only archived fields can be deleted). A visible red button
  // would put irreversible data loss on equal footing with Save.
  const confirmDeleteField = (existing: MemberCustomField) => {
    onClose();
    confirm({
      title: 'Delete custom field',
      prompt: (
        <>
          <strong>{existing.name}</strong> and every value collected from your members will be
          permanently deleted from the database. This can&rsquo;t be undone.
        </>
      ),
      okLabel: 'Delete',
      okVariant: 'destructive',
      onOk: async (deleteModal) => {
        try {
          await deleteField(existing.key);
          deleteModal?.remove();
          toast.success('Custom field deleted');
        } catch (e) {
          toast.error('Failed to delete the custom field');
          handleError(e, { withToast: false });
        }
      },
    });
  };

  const archivedFieldMenu = (existing: MemberCustomField) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button aria-label="Menu" size="icon" type="button" variant="ghost">
          <LucideIcon.Ellipsis />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="z-[9999]">
        <DropdownMenuItem
          className="text-destructive focus:text-destructive"
          onSelect={() => confirmDeleteField(existing)}
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
      // Closing with edits, by Cancel, Escape or a click outside, asks first, as the tier modal
      // does: a list's options can be a lot to lose. Judged by what the form holds rather than by
      // the save state, which a refused save sets to an error while the edits are still there,
      // and which stays unsaved after an edit is changed back.
      dirty={!dequal(formState, initialDraft)}
      leftButton={leftButton}
      okLabel={okProps.label || 'Save'}
      okVariant={okProps.variant}
      size="sm"
      testId="custom-field-modal"
      title={isEdit ? 'Edit custom field' : 'Add custom field'}
      topRightContent={field && isArchived ? archivedFieldMenu(field) : undefined}
      // A list's options can run long, so Save stays in reach, as the tier modal keeps it beside
      // a long list of benefits.
      stickyFooter
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
          disabled={isArchived}
          draft={formState}
          errors={errors}
          field={field}
          idPrefix="custom-field"
          saving={saveState === 'saving'}
          types={offeredTypes}
          withVisibility
          onChange={updateForm}
          onClearErrors={(which) => {
            if (which === 'name') {
              clearError('name');
              return;
            }
            setErrors(
              Object.fromEntries(
                Object.entries(errors).filter(([property]) => !isSettingsProblem(property)),
              ),
            );
          }}
        />
      </div>
    </SettingsModal>
  );
};

export default CustomFieldModal;
