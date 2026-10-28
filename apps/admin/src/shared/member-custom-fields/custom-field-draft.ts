import { listOptionsError } from './list-options';
import {
  memberCustomFieldUserTypes,
  userTypeForFieldType,
} from '@tryghost/admin-x-framework/api/member-custom-fields';
import type {
  MemberCustomField,
  MemberCustomFieldAccess,
} from '@tryghost/admin-x-framework/api/member-custom-fields';

/** A field as the form holds it while it is created or edited. */
export interface CustomFieldDraft {
  name: string;
  type: MemberCustomField['type'];
  access: MemberCustomFieldAccess;
  // Only read for a list.
  options: string[];
  multiple: boolean;
}

/** A field's draft as it stands, or an empty one for a field yet to be created. */
export const draftOf = (field?: MemberCustomField): CustomFieldDraft => ({
  name: field?.name ?? '',
  type: field?.type ?? memberCustomFieldUserTypes[0].id,
  access: field?.access.member ?? 'none',
  options: field?.options ?? [],
  multiple: field?.multiple ?? false,
});

/**
 * What is wrong with a draft before it is sent, keyed by the input it belongs under. The
 * same checks wherever a field is made or edited. Whether a name is already taken is the
 * API's to say, and comes back from the save.
 */
export const customFieldErrors = (draft: CustomFieldDraft): { name?: string; options?: string } => {
  const options =
    userTypeForFieldType(draft.type).input === 'list' ? listOptionsError(draft.options) : undefined;
  return {
    ...(draft.name.trim() ? {} : { name: 'Enter a name for the field' }),
    ...(options ? { options } : {}),
  };
};
