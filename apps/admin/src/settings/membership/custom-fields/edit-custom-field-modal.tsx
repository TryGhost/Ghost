import { useState } from 'react';
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@tryghost/shade/components';
import {
  ArchivedVisibilityField,
  CustomFieldForm,
  FixedTypeField,
  NameField,
  VisibilityField,
} from '@/shared/member-custom-fields/custom-field-form';
import { ArchivedListField, ListField } from '@/shared/member-custom-fields/list-settings';
import { editErrors, editOf, valuesOf } from '@/shared/member-custom-fields/custom-field-values';
import { useCustomFieldModal } from '@/settings/membership/custom-fields/use-custom-field-modal';
import { LucideIcon } from '@tryghost/shade/utils';
import { SettingsModal } from '@tryghost/shade/patterns';
import {
  type MemberCustomField,
  useDeleteMemberCustomField,
  useEditMemberCustomField,
  userTypeForFieldType,
} from '@tryghost/admin-x-framework/api/member-custom-fields';
import { toast } from 'sonner';
import { useConfirmation } from '@/settings/providers/confirmation-context';
import { useHandleError } from '@tryghost/admin-x-framework/hooks';

/**
 * The buttons that change whether a field is in use: Archive for an active field, Reactivate for
 * an archived one, and permanent deletion, offered only for an archived field. Each asks for
 * confirmation first, because each changes what every surface that collects values shows.
 */
function useFieldStatusActions(field: MemberCustomField, onClose: () => void) {
  const { confirm } = useConfirmation();
  const { mutateAsync: editField } = useEditMemberCustomField();
  const { mutateAsync: deleteField } = useDeleteMemberCustomField();
  const handleError = useHandleError();

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
                Your custom field <strong>{field.name}</strong> will no longer show up on your
                members, collect new information, or appear in filters.
              </div>
              <div>Values already collected for this field will remain unchanged.</div>
            </>
          ),
          okLabel: 'Archive',
          okVariant: 'destructive',
          onOk: async (archiveModal) => {
            try {
              // Archiving is a status change over the same PUT a rename uses. DELETE is the
              // permanent, values-destroying removal, and only valid on an archived field.
              await editField({ key: field.key, status: 'archived' });
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
                Reactivating <strong>{field.name}</strong> will immediately make it available again
                on your members, for collecting, and in filters.
              </div>
              <div>Values already collected for this field will remain unchanged.</div>
              {field.access.member !== 'none' && (
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
              await editField({ key: field.key, status: 'active' });
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

  // Permanent deletion hides behind the header menu, one deliberate click away, as the members
  // page's actions menu does and as the API's own two steps do. A visible red button would put
  // irreversible data loss on equal footing with Save.
  const deleteMenu = (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button aria-label="Menu" size="icon" type="button" variant="ghost">
          <LucideIcon.Ellipsis />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="z-[9999]">
        <DropdownMenuItem
          className="text-destructive focus:text-destructive"
          onSelect={() => {
            onClose();
            confirm({
              title: 'Delete custom field',
              prompt: (
                <>
                  <strong>{field.name}</strong> and every value collected from your members will be
                  permanently deleted from the database. This can&rsquo;t be undone.
                </>
              ),
              okLabel: 'Delete',
              okVariant: 'destructive',
              onOk: async (deleteModal) => {
                try {
                  await deleteField(field.key);
                  deleteModal?.remove();
                  toast.success('Custom field deleted');
                } catch (e) {
                  toast.error('Failed to delete the custom field');
                  handleError(e, { withToast: false });
                }
              },
            });
          }}
        >
          <LucideIcon.Trash2 className="size-4" />
          Delete custom field
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return field.status === 'archived'
    ? { leftButton: reactivateButton, topRightContent: deleteMenu }
    : { leftButton: archiveButton, topRightContent: undefined };
}

/**
 * Edits a saved custom field in Settings. Its name and who can see it can change. Its type can't,
 * and a list keeps the text of the options it is saved with, while options added in this edit can
 * change until it is saved. An archived field's settings are shown with nothing to change them.
 */
export function EditCustomFieldModal({
  field,
  onClose,
}: {
  field: MemberCustomField;
  onClose: () => void;
}) {
  const { mutateAsync: editField } = useEditMemberCustomField();
  const { leftButton, topRightContent } = useFieldStatusActions(field, onClose);
  const [start] = useState(() => valuesOf(field));
  const { state, modalProps } = useCustomFieldModal({
    start,
    validate: (values) => editErrors(values, start),
    save: async (values) => {
      const edit = editOf(values, start);
      if (edit) {
        await editField({ key: field.key, ...edit });
      }
    },
    onClose,
  });
  const isArchived = field.status === 'archived';

  return (
    <SettingsModal
      {...modalProps}
      cancelLabel="Close"
      leftButton={leftButton}
      title="Edit custom field"
      topRightContent={topRightContent}
    >
      <div className="mt-10">
        <CustomFieldForm className="gap-8" idPrefix="custom-field" state={state}>
          <NameField />
          <FixedTypeField type={userTypeForFieldType(field.type)} />
          {isArchived ? <ArchivedListField /> : <ListField />}
          {isArchived ? (
            <ArchivedVisibilityField />
          ) : (
            <VisibilityField saved={field.access.member} />
          )}
        </CustomFieldForm>
      </div>
    </SettingsModal>
  );
}
