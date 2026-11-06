import {
  SHAPE_SETTINGS,
  TypedSettingsInputSchema,
  refusedProperty,
} from '@tryghost/metafield-types';
import { dequal } from 'dequal';
import {
  MAX_OPTIONS,
  MIN_OPTIONS,
  matchField,
  matchShape,
  optionText,
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
};

/**
 * What is wrong with a draft, keyed by the path Ghost names a refusal by, so each problem lands
 * beside the input that set it: `name`, or a path within the settings such as `settings.options.2`
 * for a list's third option.
 */
export type CustomFieldDraftErrors = Readonly<Record<string, string | undefined>>;

/** Whether a problem is with the settings: the settings as a whole, or a part of them. */
export const isSettingsProblem = (property: string) =>
  property === 'settings' || property.startsWith('settings.');

/** `type` with what a field of its shape is set up with before anyone sets it up. */
export const defaultTypedSettings = (type: FieldType): TypedSettings =>
  matchShape<TypedSettings>(type, {
    scalar: (_structure, scalarType) => ({ type: scalarType }),
    record: (_structure, recordType) => ({ type: recordType }),
    set: (_structure, setType) => ({ type: setType, settings: SHAPE_SETTINGS.set.defaults }),
  });

/** A new field of `type`, named nothing yet and seen by staff only. */
export const newDraft = (type: FieldType): CustomFieldDraft => ({
  name: '',
  access: 'none',
  ...defaultTypedSettings(type),
});

/** A field as it stands, to be edited. Its type and settings are taken as one, so they stay paired. */
export const draftOf = (field: MemberCustomField): CustomFieldDraft => ({
  name: field.name,
  access: field.access.member,
  ...matchField<MemberCustomField, TypedSettings>(field, {
    scalar: ({ type }) => ({ type }),
    record: ({ type }) => ({ type }),
    set: ({ type, settings }) => ({ type, settings }),
  }),
});

/**
 * What is wrong with a draft before it is sent: the same checks wherever a field is made or
 * edited. Settings are checked with the type by the rules the server applies, in its words: all of
 * a new field's, and an edited field's only when they change, so settings saved under an older
 * rule are kept. Whether a name is already taken is the API's to say, and comes back from the save.
 */
export function customFieldDraftErrors(
  draft: CustomFieldDraft,
  saved?: MemberCustomField,
): CustomFieldDraftErrors {
  const errors: Record<string, string> = {};
  if (!draft.name.trim()) {
    errors.name = 'Enter a name for the field';
  }
  if (!saved || !dequal(draft.settings, saved.settings)) {
    const checked = TypedSettingsInputSchema.safeParse({
      type: draft.type,
      settings: draft.settings,
    });
    for (const issue of checked.error?.issues ?? []) {
      errors[refusedProperty(issue.path)] ??= issue.message;
    }
    Object.assign(errors, repeatedOptionErrors(draft, errors));
  }
  return errors;
}

/** Why an option that repeats another is refused, said of the option, as a taken name is. */
export const REPEATED_OPTION = 'This option already exists.';

/**
 * The rules refuse a list that offers the same text twice as a whole. Each repeat is shown on its
 * own row instead, so the one to change is the one marked: the second and any later, since the
 * first was there before it.
 */
function repeatedOptionErrors(
  draft: CustomFieldDraft,
  errors: Record<string, string>,
): Record<string, string> {
  const options = draft.settings?.options.map(optionText) ?? [];
  // Two emptied options repeat too, but each row already asks for its text, so it isn't marked twice.
  const repeats = options.flatMap((option, index) =>
    options.indexOf(option) < index ? [index] : [],
  );
  // Between the bounds, a repeat is the only problem with the list as a whole, so the rows say it.
  if (repeats.length === 0 || options.length < MIN_OPTIONS || options.length > MAX_OPTIONS) {
    return {};
  }
  delete errors['settings.options'];
  return Object.fromEntries(
    repeats
      .filter((index) => !errors[`settings.options.${index}`])
      .map((index) => [`settings.options.${index}`, REPEATED_OPTION]),
  );
}

/** The field a draft asks to create. No key: the backend mints it from the name. */
export const newCustomField = (draft: CustomFieldDraft): NewMemberCustomField => ({
  name: draft.name.trim(),
  type: draft.type,
  ...(draft.settings ? { settings: draft.settings } : {}),
  access: { member: draft.access },
});
