import { TypedSettingsInputSchema } from '@tryghost/metafield-types';
import { listSettings, typedSettings } from '@/shared/member-custom-fields/list-settings';
import {
  matchField,
  type FieldType,
  type TypedSettings,
} from '@tryghost/metafield-types/structure';
import type {
  MemberCustomField,
  MemberCustomFieldAccess,
  NewMemberCustomField,
} from '@tryghost/admin-x-framework/api/member-custom-fields';

/** A field as a form holds it while it is created or edited: its type with what that type takes. */
export type CustomFieldDraft = TypedSettings & {
  readonly name: string;
  readonly access: MemberCustomFieldAccess;
  // What is typed into a list's new option input but not yet added, which is saved as an option
  // with the rest. Only a list reads it.
  readonly newOption: string;
};

export type CustomFieldDraftErrors = { name?: string; settings?: string };

/** A field of `type` with nothing set up yet. */
export const emptyTypedSettings = (type: FieldType): TypedSettings =>
  typedSettings(type, { options: [], multiple: false });

/** A new field of `type`, named nothing yet and seen by staff only. */
export const newDraft = (type: FieldType): CustomFieldDraft => ({
  name: '',
  access: 'none',
  newOption: '',
  ...emptyTypedSettings(type),
});

/** A field as it stands, to be edited. Its type and settings are taken as one, so they stay paired. */
export const draftOf = (field: MemberCustomField): CustomFieldDraft => ({
  name: field.name,
  access: field.access.member,
  newOption: '',
  ...matchField<MemberCustomField, TypedSettings>(field, {
    scalar: ({ type, settings }) => ({ type, settings }),
    record: ({ type, settings }) => ({ type, settings }),
    set: ({ type, settings }) => ({ type, settings }),
  }),
});

/** The type and settings a draft asks for, with a list's typed but unadded option among its options. */
export const draftSettings = (draft: CustomFieldDraft): TypedSettings =>
  matchField<CustomFieldDraft, TypedSettings>(draft, {
    scalar: ({ type }) => ({ type, settings: null }),
    record: ({ type }) => ({ type, settings: null }),
    set: ({ type, settings, newOption }) => ({
      type,
      settings: listSettings({ ...settings, newOption }),
    }),
  });

/**
 * What is wrong with a draft before it is sent, keyed by the input it belongs under: the same
 * checks wherever a field is made or edited, and for settings the rules the server applies, in its
 * words. Whether a name is already taken is the API's to say, and comes back from the save.
 */
export function customFieldDraftErrors(draft: CustomFieldDraft): CustomFieldDraftErrors {
  const errors: CustomFieldDraftErrors = {};
  if (!draft.name.trim()) {
    errors.name = 'Enter a name for the field';
  }
  const checked = TypedSettingsInputSchema.safeParse(draftSettings(draft));
  if (!checked.success) {
    errors.settings = checked.error.issues[0].message;
  }
  return errors;
}

/** The field a draft asks to create. No key: the backend mints it from the name. */
export const newCustomField = (draft: CustomFieldDraft): NewMemberCustomField => ({
  name: draft.name.trim(),
  ...draftSettings(draft),
  access: { member: draft.access },
});
