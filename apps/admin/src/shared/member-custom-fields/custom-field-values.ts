import { SHAPE_SETTINGS, TypedSettingsInputSchema } from '@tryghost/metafield-types';
import { dequal } from 'dequal';
import {
  matchField,
  matchShape,
  type FieldShape,
  type FieldType,
  type SetSettings,
  type ShapeOf,
  type TypedSettings,
} from '@tryghost/metafield-types/structure';
import {
  type ListInputs,
  type OptionRow,
  newListInputs,
  savedListInputs,
  settingsOf,
} from '@/shared/member-custom-fields/list-inputs';
import {
  type MemberCustomField,
  type MemberCustomFieldAccess,
  type MemberCustomFieldEdit,
  type NewMemberCustomField,
  memberCustomFieldProblemsOf,
} from '@tryghost/admin-x-framework/api/member-custom-fields';

/**
 * What a form asks about a field of each shape beyond its name: a list's inputs, and nothing for
 * any other shape. Keyed by shape, so a shape added to the catalog fails to compile here until a
 * form knows what to ask about it.
 */
interface InputsOfShape extends Record<FieldShape, unknown> {
  scalar: undefined;
  record: undefined;
  set: ListInputs;
}

type ListField<Inputs> = [Inputs] extends [undefined]
  ? { readonly list?: undefined }
  : { readonly list: Inputs };

type TypedInputs = {
  [T in FieldType]: { readonly type: T } & ListField<InputsOfShape[ShapeOf<T>]>;
}[FieldType];

/**
 * A custom field as a form holds it while it is made or edited: its name, who can see it, and its
 * type with the inputs that type takes. What Ghost is sent is worked out from these.
 */
export type CustomFieldValues = TypedInputs & {
  readonly name: string;
  readonly access: MemberCustomFieldAccess;
};

/** The inputs a new field of `type` starts with. A list's start from `list`. */
const inputsFor = (type: FieldType, list: SetSettings): TypedInputs =>
  matchShape<TypedInputs>(type, {
    scalar: (_structure, scalarType) => ({ type: scalarType }),
    record: (_structure, recordType) => ({ type: recordType }),
    set: (_structure, setType) => ({ type: setType, list: newListInputs(list) }),
  });

/**
 * A new field of `type`, named `name` and seen by staff only. A list starts from `list`, such as
 * the options an import column holds.
 */
export const newValues = (
  type: FieldType,
  name = '',
  list: SetSettings = SHAPE_SETTINGS.set.defaults,
): CustomFieldValues => ({ name, access: 'none', ...inputsFor(type, list) });

/**
 * A new field's values as a field of `type`. Settings belong to a type, so another type's inputs
 * start again, a list's from `list`.
 */
export const withType = (
  values: CustomFieldValues,
  type: FieldType,
  list: SetSettings = SHAPE_SETTINGS.set.defaults,
): CustomFieldValues => ({ name: values.name, access: values.access, ...inputsFor(type, list) });

/** A saved field's values, to be edited. A list's options are its saved options. */
export const valuesOf = (field: MemberCustomField): CustomFieldValues => ({
  name: field.name,
  access: field.access.member,
  ...matchField<MemberCustomField, TypedInputs>(field, {
    scalar: ({ type }) => ({ type }),
    record: ({ type }) => ({ type }),
    set: ({ type, settings }) => ({ type, list: savedListInputs(settings) }),
  }),
});

/** The values with a list's inputs changed by `change`. Values for another type are unchanged. */
export const withList = (
  values: CustomFieldValues,
  change: (list: ListInputs) => ListInputs,
): CustomFieldValues =>
  values.list === undefined ? values : { ...values, list: change(values.list) };

/** The type the values ask for, with the settings their inputs ask for. */
const typedSettingsOf = (values: CustomFieldValues): TypedSettings =>
  values.list === undefined
    ? { type: values.type }
    : { type: values.type, settings: settingsOf(values.list) };

/** Everything the values ask Ghost for, tidied as Ghost would tidy it. */
const requestOf = (values: CustomFieldValues) => ({
  name: values.name.trim(),
  access: values.access,
  ...typedSettingsOf(values),
});

/** What a form's values ask for that its starting values didn't. */
interface FieldChanges {
  readonly name?: string;
  readonly access?: MemberCustomFieldAccess;
  readonly type?: FieldType;
  readonly settings?: SetSettings;
}

/**
 * What the values ask for that `start` didn't, or null when they ask for the same thing. An option
 * removed and added back, or a change typed and then undone, asks for the same thing. This is
 * whether a form has been changed, and for an edit what is sent.
 */
export const changesOf = (
  values: CustomFieldValues,
  start: CustomFieldValues,
): FieldChanges | null => {
  const now = requestOf(values);
  const was = requestOf(start);
  const changes: FieldChanges = {
    ...(now.name === was.name ? {} : { name: now.name }),
    ...(now.access === was.access ? {} : { access: now.access }),
    ...(now.type === was.type ? {} : { type: now.type }),
    ...(now.settings && !dequal(now.settings, was.settings) ? { settings: now.settings } : {}),
  };
  return Object.keys(changes).length === 0 ? null : changes;
};

export const hasChanged = (values: CustomFieldValues, start: CustomFieldValues): boolean =>
  changesOf(values, start) !== null;

/** The field the values ask Ghost to create. No key: Ghost mints it from the name. */
export const newFieldOf = (values: CustomFieldValues): NewMemberCustomField => {
  const { name, access, type, settings } = requestOf(values);
  return { name, type, ...(settings ? { settings } : {}), access: { member: access } };
};

/**
 * What an edit sends: only what the values change from `start`, the field as it was opened.
 * Sending the whole field would carry whatever the list of fields held when it was loaded, so
 * saving a rename would silently undo an access change a colleague made meanwhile. A list's
 * settings are sent whole.
 */
export const editOf = (
  values: CustomFieldValues,
  start: CustomFieldValues,
): Omit<MemberCustomFieldEdit, 'key'> => {
  const { name, access, settings } = changesOf(values, start) ?? {};
  return {
    ...(name === undefined ? {} : { name }),
    ...(access === undefined ? {} : { access: { member: access } }),
    ...(settings === undefined ? {} : { settings }),
  };
};

/** Where a form shows a problem: beside the name, a list's parts, or one of its options. */
export type CustomFieldErrorKey =
  | 'name'
  | 'options'
  | 'newOption'
  | 'multiple'
  | `option.${string}`;

/** The problems a form shows, each beside the input it is about. */
export type CustomFieldErrors = Readonly<Partial<Record<CustomFieldErrorKey, string>>>;

/** Where a problem with one option is shown. */
export const optionErrorKey = (option: OptionRow): CustomFieldErrorKey => `option.${option.id}`;

/** The problems left once a list's inputs change: the name's, which a list change doesn't answer. */
export const withoutListErrors = ({ name }: CustomFieldErrors): CustomFieldErrors => ({ name });

interface Problem {
  readonly path: readonly PropertyKey[];
  readonly message: string;
}

/**
 * Where a problem at `path` within a list's settings is shown, or null when the form has no place
 * for it. An option is named by its place among `checked`, the options in the order they were
 * checked, and the place after the last of them is the typed text, checked as the last option.
 */
const listPlace = (
  path: readonly PropertyKey[],
  checked: readonly OptionRow[],
): CustomFieldErrorKey | null => {
  const [part, place, ...beyond] = path;
  if (beyond.length > 0) {
    return null;
  }
  if (part === undefined || (part === 'options' && place === undefined)) {
    return 'options';
  }
  if (part === 'multiple' && place === undefined) {
    return 'multiple';
  }
  if (part !== 'options' || typeof place !== 'number' || place < 0 || place > checked.length) {
    return null;
  }
  return place === checked.length ? 'newOption' : optionErrorKey(checked[place]);
};

/** Where a problem with the values at `path` is shown, or null when the form has no place for it. */
const placeOf = (
  path: readonly PropertyKey[],
  values: CustomFieldValues,
  checked: readonly OptionRow[],
): CustomFieldErrorKey | null => {
  const [root, ...within] = path;
  if (root === 'name' && within.length === 0) {
    return 'name';
  }
  return root === 'settings' && values.list ? listPlace(within, checked) : null;
};

/** Each problem filed where `place` puts it, keeping the first for each place. Null if any has none. */
const filed = (
  problems: readonly Problem[],
  place: (path: readonly PropertyKey[]) => CustomFieldErrorKey | null,
): CustomFieldErrors | null => {
  const errors: Partial<Record<CustomFieldErrorKey, string>> = {};
  for (const { path, message } of problems) {
    const key = place(path);
    if (key === null) {
      return null;
    }
    errors[key] ??= message;
  }
  return errors;
};

const nameErrors = (values: CustomFieldValues): CustomFieldErrors =>
  values.name.trim() ? {} : { name: 'Enter a name for the field' };

/**
 * The settings' problems, by the rules Ghost applies and in its words. Every problem the rules can
 * find with what a form asks for has a place, and anything else is shown with the list as a whole,
 * so a refused form always says why.
 */
const settingsErrors = (values: CustomFieldValues): CustomFieldErrors => {
  const checked = values.list?.options ?? [];
  const result = TypedSettingsInputSchema.safeParse(typedSettingsOf(values));
  const problems = result.error?.issues ?? [];
  return filed(problems, (path) => placeOf(path, values, checked) ?? 'options') ?? {};
};

/**
 * What is wrong with a new field's values before they are sent. Whether the name is already taken
 * is Ghost's to say, and comes back from the save.
 */
export const newFieldErrors = (values: CustomFieldValues): CustomFieldErrors => ({
  ...nameErrors(values),
  ...settingsErrors(values),
});

/**
 * What is wrong with an edit before it is sent. The settings are checked only when they change from
 * `start`, so settings saved under an older rule are kept.
 */
export const editErrors = (
  values: CustomFieldValues,
  start: CustomFieldValues,
): CustomFieldErrors => ({
  ...nameErrors(values),
  ...(changesOf(values, start)?.settings ? settingsErrors(values) : {}),
});

/** A property as Ghost names a refused one, such as `settings.options.2`, read as a path. */
const pathOf = (property: string): PropertyKey[] =>
  property.split('.').map((part) => (/^\d+$/.test(part) ? Number(part) : part));

/**
 * Ghost's refusal of what a form sent, filed beside the inputs that set what was refused. Null
 * when any part of it has no input to stand beside, such as a refusal of the request itself, so
 * the caller reports it instead. Ghost names an option by its place among the options as sent,
 * which is the order they are shown in.
 */
export const refusalErrors = (
  error: unknown,
  values: CustomFieldValues,
): CustomFieldErrors | null => {
  const problems = memberCustomFieldProblemsOf(error);
  if (!problems?.length) {
    return null;
  }
  const shown = values.list?.options ?? [];
  return filed(
    problems.map(({ property, message }) => ({ path: pathOf(property), message })),
    (path) => placeOf(path, values, shown),
  );
};
