import { useState } from 'react';
import {
  CustomFieldForm,
  NameField,
  TypeField,
  VisibilityField,
} from '@/shared/member-custom-fields/custom-field-form';
import { ListField } from '@/shared/member-custom-fields/list-settings';
import { SettingsModal } from '@tryghost/shade/patterns';
import {
  memberCustomFieldUserTypes,
  useCreateMemberCustomField,
} from '@tryghost/admin-x-framework/api/member-custom-fields';
import {
  newFieldErrors,
  newFieldOf,
  newValues,
} from '@/shared/member-custom-fields/custom-field-values';
import { useCustomFieldModal } from '@/settings/membership/custom-fields/use-custom-field-modal';

/**
 * Adds a custom field in Settings. Everything about it can be changed until it is saved: its type,
 * and a list's options too.
 */
export function AddCustomFieldModal({ onClose }: { onClose: () => void }) {
  const { mutateAsync: createField } = useCreateMemberCustomField();
  const [start] = useState(() => newValues(memberCustomFieldUserTypes[0].id));
  const { state, modalProps } = useCustomFieldModal({
    start,
    validate: newFieldErrors,
    save: (values) => createField(newFieldOf(values)),
    onClose,
  });

  return (
    <SettingsModal {...modalProps} cancelLabel="Cancel" title="Add custom field">
      <div className="mt-10">
        <CustomFieldForm className="gap-8" idPrefix="custom-field" state={state}>
          <NameField />
          <TypeField types={memberCustomFieldUserTypes} />
          <ListField />
          <VisibilityField />
        </CustomFieldForm>
      </div>
    </SettingsModal>
  );
}
