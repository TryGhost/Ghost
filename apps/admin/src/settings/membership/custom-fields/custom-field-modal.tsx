import React from 'react';
import { CustomFieldTypeOption } from '@/shared/member-custom-fields/custom-field-type-option';
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
} from '@tryghost/shade/components';
import { LucideIcon, formatNumber } from '@tryghost/shade/utils';
import { SettingsModal } from '@tryghost/shade/patterns';
import { ValidationError, getErrorMessage } from '@tryghost/admin-x-framework/errors';
import { useMemberCount } from '@tryghost/admin-x-framework/api/members';
import {
  memberCustomFieldUserTypes,
  useCreateMemberCustomField,
  useDeleteMemberCustomField,
  useEditMemberCustomField,
  userTypeForField,
} from '@tryghost/admin-x-framework/api/member-custom-fields';
import { toast } from 'sonner';
import { useConfirmation } from '@/settings/providers/confirmation-context';
import { useForm, useHandleError } from '@tryghost/admin-x-framework/hooks';
import type { MemberCustomField } from '@tryghost/admin-x-framework/api/member-custom-fields';

const userTypeById = (id: string) =>
  memberCustomFieldUserTypes.find((userType) => userType.id === id) ||
  memberCustomFieldUserTypes[0];

const CustomFieldModal: React.FC<{ field?: MemberCustomField; onClose: () => void }> = ({
  field,
  onClose,
}) => {
  const { confirm } = useConfirmation();
  const { mutateAsync: createField } = useCreateMemberCustomField();
  const { mutateAsync: editField } = useEditMemberCustomField();
  const { mutateAsync: deleteField } = useDeleteMemberCustomField();
  const handleError = useHandleError();
  const memberCount = useMemberCount();
  const isEdit = field !== undefined;

  const { formState, updateForm, handleSave, errors, clearError, setErrors, okProps } = useForm({
    initialState: {
      name: field?.name || '',
      // Form state tracks the user-type id; it maps to the API storage
      // type on save
      userTypeId: field ? userTypeForField(field).id : memberCustomFieldUserTypes[0].id,
      access: field ? field.access.member : 'none',
    },
    savingDelay: 500,
    onValidate: (state) => {
      // Name uniqueness is enforced by the API (globally unique); a 422
      // comes back through onSaveError and highlights the field. Here we
      // only guard the empty case so we never POST a blank name.
      const newErrors: Record<string, string> = {};
      if (!state.name.trim()) {
        newErrors.name = 'Enter a name for the field';
      }
      return newErrors;
    },
    onSave: async (state) => {
      if (field) {
        // Only the properties this form actually changed. Sending the whole field back
        // would carry whatever the list held when it was loaded, so saving a rename
        // would silently restore the access a colleague had changed in the meantime.
        const name = state.name.trim();
        await editField({
          key: field.key,
          ...(name === field.name ? {} : { name }),
          ...(state.access === field.access.member ? {} : { access: { member: state.access } }),
        });
      } else {
        // No key: the backend mints it from the name.
        await createField({
          name: state.name.trim(),
          type: userTypeById(state.userTypeId).id,
          access: { member: state.access },
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
  const selectedType = userTypeById(formState.userTypeId);

  // The API keeps a third access level, `read`, that the switch doesn't offer. A field
  // already set to it reads as open and is described as such; saving without touching
  // the switch leaves it there, since the edit sends only what changed, and switching it
  // off and on again returns it to the level it had rather than upgrading it.
  const isOpenToMembers = formState.access !== 'none';
  const storedOpenLevel = field && field.access.member !== 'none' ? field.access.member : 'write';
  // Opening a field that was closed discloses whatever staff have recorded in it so far.
  const isOpeningClosedField = isEdit && isOpenToMembers && field.access.member === 'none';

  let accessDescription;
  if (isArchived) {
    accessDescription =
      'Members never see an archived field. Reactivate it to choose whether they can see this one.';
  } else if (isOpenToMembers) {
    // The count is left out while it loads, as the newsletter modal does.
    const members = `Your ${memberCount === undefined ? '' : formatNumber(memberCount)} member${memberCount === 1 ? '' : 's'}`;
    accessDescription =
      formState.access === 'read'
        ? `${members} can see this field in their Portal account settings, but not change it.`
        : `${members} can see and update this field in their Portal account settings.`;
  } else {
    accessDescription = 'Only staff can see this field and what you record in it.';
  }

  // The modal's third action mirrors the field's state: an active field can
  // be archived, an archived one reactivated. Both confirm first (the
  // newsletters pattern) — they change what every collection surface shows.
  const archiveButton = (
    <Button
      className="text-destructive hover:text-destructive"
      size="sm"
      type="button"
      variant="ghost"
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
      <FieldGroup className="mt-10 gap-8">
        <Field data-invalid={Boolean(errors.name) || undefined}>
          <FieldLabel htmlFor="custom-field-name">Name</FieldLabel>
          <Input
            aria-invalid={Boolean(errors.name) || undefined}
            autoComplete="off"
            id="custom-field-name"
            placeholder="Enter custom field name"
            value={formState.name}
            autoFocus
            onChange={(e) => updateForm((state) => ({ ...state, name: e.target.value }))}
            onKeyDown={() => clearError('name')}
          />
          {errors.name && <FieldError>{errors.name}</FieldError>}
        </Field>
        <Field data-disabled={isEdit || undefined}>
          <FieldLabel>Type</FieldLabel>
          <Select
            disabled={isEdit}
            value={formState.userTypeId}
            onValueChange={(value) => {
              updateForm((state) => ({ ...state, userTypeId: userTypeById(value).id }));
            }}
          >
            <SelectTrigger aria-label="Type" data-testid="custom-field-type">
              <SelectValue placeholder="Select type">
                <CustomFieldTypeOption type={selectedType.id} />
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {memberCustomFieldUserTypes.map((userType) => (
                <SelectItem key={userType.id} value={userType.id}>
                  <CustomFieldTypeOption type={userType.id} />
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {isEdit && <FieldDescription>Type can’t be changed after creation</FieldDescription>}
        </Field>
        <Field data-disabled={isArchived || undefined} orientation="horizontal">
          <FieldContent>
            <FieldLabel htmlFor="custom-field-visible-to-members">Visible to members</FieldLabel>
            <FieldDescription>
              {accessDescription}
              {isOpeningClosedField && <> Anything already recorded will become visible.</>}
            </FieldDescription>
          </FieldContent>
          <Switch
            checked={!isArchived && isOpenToMembers}
            data-testid="custom-field-access"
            disabled={isArchived}
            id="custom-field-visible-to-members"
            onCheckedChange={(checked) =>
              updateForm((state) => ({ ...state, access: checked ? storedOpenLevel : 'none' }))
            }
          />
        </Field>
      </FieldGroup>
    </SettingsModal>
  );
};

export default CustomFieldModal;
