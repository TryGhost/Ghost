import CustomFieldIcon from './custom-field-icon';
import { userTypeForFieldType } from '@tryghost/admin-x-framework/api/member-custom-fields';
import type { MemberCustomField } from '@tryghost/admin-x-framework/api/member-custom-fields';

/**
 * A field type as it appears in a picker: its icon and its name.
 *
 * Shared rather than owned by Settings so that wherever a publisher is offered the field
 * types, they read the same, and so a type's icon is decided in one place.
 */
export function CustomFieldTypeOption({ type }: { type: MemberCustomField['type'] }) {
  return (
    <span className="flex items-center gap-2">
      {/* Fixed width so labels line up in a column whatever shape the icon is. */}
      <span className="flex w-5 shrink-0 items-center justify-center">
        <CustomFieldIcon className="size-4" type={type} />
      </span>
      <span>{userTypeForFieldType(type).label}</span>
    </span>
  );
}
