import {
  FIELD_STRUCTURES,
  FIELD_TYPE_IDS,
  MEMBER_ACCESS_LEVELS,
  MetafieldDefinitionSchema,
  isRecordValue,
  matchLeaf,
  matchShape,
  type MemberAccess,
  type MetafieldDefinition,
  partsOf,
  type FieldType,
  type FieldTypeOfShape,
  type Leaf,
  type ListSource,
  type PartsOf,
  type SetSettings,
  type SettingsOf,
  type TypedSettings,
} from '@tryghost/metafield-types';
import { z } from 'zod';
import { IdentityTextSchema, type Part } from '@tryghost/metafield-types/identity';
import { csvColumnsForField } from '@tryghost/metafield-csv';
import { LucideIcon } from '@tryghost/shade/utils';
import { createMutation, createQuery } from '../utils/api/hooks';
import { countryName, countryOptions } from '../utils/countries';

// Re-exported so the import mapping can recognize a custom_fields.* column (same reason
// as the re-exports below).
export { isMetafieldColumn, splitOptions as splitListCell } from '@tryghost/metafield-csv';

export type { Address as MemberCustomFieldAddress } from '@tryghost/metafield-types';
export { valueSchemaFor as memberCustomFieldValueSchema } from '@tryghost/metafield-types';

/**
 * A field definition. It has no `id`: a field is addressed by its namespace and key, and a key is
 * never reissued once minted. Browsing leaves out archived fields unless they are asked for.
 */
export type MemberCustomField = MetafieldDefinition;

/**
 * A field's identity as text, or the identity of one part of its value when parts are given.
 * Written by the shared codec, so every identity Admin keys or compares by is spelled the way
 * the server spells it.
 */
export const memberCustomFieldIdentity = (
  field: Pick<MemberCustomField, 'namespace' | 'key'>,
  parts: Part[] = [],
): string => z.encode(IdentityTextSchema, { namespace: field.namespace, key: field.key, parts });

// The levels themselves are the shared vocabulary; what a publisher is told they mean
// is presentation, and stays below.
export type MemberCustomFieldAccess = MemberAccess;

const ACCESS_PRESENTATION: {
  [A in MemberCustomFieldAccess]: { label: string; description: string };
} = {
  none: {
    label: 'Only staff',
    description: 'Members never see this field or what you record in it',
  },
  read: {
    label: 'Members can view',
    description: 'Shown in their account, but only staff can change it',
  },
  write: {
    label: 'Members can edit',
    description: 'Members fill this in and keep it up to date themselves',
  },
};

export const MEMBER_CUSTOM_FIELD_ACCESS_OPTIONS = MEMBER_ACCESS_LEVELS.map((value) => ({
  value,
  ...ACCESS_PRESENTATION[value],
}));

export const memberAccessLabel = (access: MemberCustomFieldAccess): string =>
  ACCESS_PRESENTATION[access].label;

/**
 * How each field type is presented to a publisher: its name and its icon. The shared catalog says
 * what a type is; this says what a publisher is told it is. How a value is edited and shown comes
 * from the leaves the type is composed of, so every type made of the same leaves is edited alike.
 */
export type MemberCustomFieldUserType<T extends FieldType = FieldType> = {
  id: T;
  label: string;
  icon: typeof LucideIcon.Type;
};

/**
 * A record type also names each part, and says which parts take a full row in a form. Both are
 * typed against the parts the shared catalog declares, so adding, removing or renaming a part
 * fails the build here rather than reaching a publisher as a raw key.
 */
export type FieldTypePresentation<T extends FieldType> = {
  label: string;
  icon: MemberCustomFieldUserType['icon'];
} & ([PartsOf<T>] extends [never]
  ? { partLabels?: never; fullRowParts?: never }
  : { partLabels: Record<PartsOf<T>, string>; fullRowParts: readonly PartsOf<T>[] });

const fieldTypePresentation: { [T in FieldType]: FieldTypePresentation<T> } = {
  short_text: { label: 'Short text', icon: LucideIcon.Type },
  long_text: { label: 'Long text', icon: LucideIcon.AlignLeft },
  list: { label: 'List', icon: LucideIcon.List },
  address: {
    label: 'Address',
    icon: LucideIcon.MapPin,
    fullRowParts: ['line1', 'line2'],
    partLabels: {
      line1: 'Address line 1',
      line2: 'Address line 2',
      city: 'City',
      state: 'State',
      postal_code: 'Postal code',
      country: 'Country',
    },
  },
};

/**
 * A type's part labels, keyed by part, and empty for a type with none. Every part the type declares
 * has a label, because `FieldTypePresentation` won't compile an entry that misses one.
 */
const partLabelsFor = (type: FieldType): Record<string, string> => {
  const labels: Record<string, string> | undefined = fieldTypePresentation[type].partLabels;
  return labels ?? {};
};

// The catalog in the shared catalog's declared order, so every admin surface
// offers and renders the field types in the same order.
export const memberCustomFieldUserTypes: MemberCustomFieldUserType[] = FIELD_TYPE_IDS.map((id) => ({
  id,
  ...fieldTypePresentation[id],
}));

/**
 * A type whose fields are set up with nothing but a name and the type: no settings to give, so a
 * value from somewhere else, such as Stripe Checkout, can be saved into one as it comes.
 */
export type PlainFieldType = FieldTypeOfShape<'scalar' | 'record'>;

export const userTypeForFieldType = (type: FieldType): MemberCustomFieldUserType => ({
  id: type,
  ...fieldTypePresentation[type],
});

// As above, for a field loaded from the API.
export const userTypeForField = (field: MemberCustomField): MemberCustomFieldUserType =>
  userTypeForFieldType(field.type);

/**
 * A custom field CSV column offered as an import mapping target.
 *
 * Name and part are given apart as well as joined: a name a publisher chose can hold brackets
 * of its own, so the joined form cannot be split back into them. Every column of a composite
 * carries the composite's own type, which is what its icon is drawn from.
 */
export type MemberCustomFieldCsvColumn = {
  /** The CSV column the exporter writes and the importer reads. */
  value: string;
  fieldName: string;
  partLabel?: string;
  /** `fieldName`, or `fieldName (partLabel)`. */
  label: string;
  type: FieldType;
};

/**
 * The CSV import mapping targets for a set of custom fields: one per column the export
 * writes, labeled for the field (and part, for a composite). Column names come from
 * the shared codec the exporter writes and the importer reads, so a target is exactly a
 * round-tripping column rather than one hand-kept in sync.
 */
export const memberCustomFieldCsvColumns = (
  fields: MemberCustomField[],
): MemberCustomFieldCsvColumn[] => {
  return fields.flatMap((field) => {
    const labels = partLabelsFor(field.type);
    return csvColumnsForField(field).map(({ column, part }) => {
      const partLabel = part === null ? undefined : labels[part];
      return {
        value: column,
        fieldName: field.name,
        ...(partLabel === undefined ? {} : { partLabel }),
        label: partLabel === undefined ? field.name : `${field.name} (${partLabel})`,
        type: field.type,
      };
    });
  });
};

/** How a list a choice picks from is offered in Admin, and how one of its keys reads. */
export interface MemberCustomFieldChoiceList {
  options: (held?: string | readonly string[]) => { value: string; label: string }[];
  label: (key: string) => string;
  placeholder: string;
  searchPlaceholder: string;
}

export const memberCustomFieldChoiceLists: { [F in ListSource]: MemberCustomFieldChoiceList } = {
  countries: {
    options: (held) => countryOptions(held),
    label: countryName,
    placeholder: 'Select countries...',
    searchPlaceholder: 'Search countries...',
  },
};

/**
 * How a list field's options are offered: each by its text, in the field's order, then any
 * already held that the field no longer offers, so a saved answer or filter still shows what it
 * holds.
 */
export const memberCustomFieldOptionList = (
  settings: SetSettings,
): MemberCustomFieldChoiceList => ({
  options: (held) => {
    const heldOptions = typeof held === 'string' ? [held] : (held ?? []);
    return [
      ...settings.options,
      ...heldOptions.filter((option) => !settings.options.includes(option)),
    ].map((option) => ({ value: option, label: option }));
  },
  label: (option) => option,
  placeholder: 'Select options...',
  searchPlaceholder: 'Search options...',
});

/** A leaf's value as a publisher reads it: text as written, and a choice by its name. */
export const memberCustomFieldLeafText = (leaf: Leaf, value: string): string =>
  matchLeaf(leaf, {
    text: () => value,
    choice: ({ from }) => memberCustomFieldChoiceLists[from].label(value),
  });

export type MemberCustomFieldPart = {
  key: string;
  label: string;
  leaf: Leaf;
  fullRow: boolean;
};

/**
 * The parts of a composite field type, or null for a scalar.
 *
 * Which parts exist, and in what order, comes from the value schema; naming them is this
 * catalog's job.
 */
export const memberCustomFieldParts = (type: FieldType): MemberCustomFieldPart[] | null =>
  matchShape<MemberCustomFieldPart[] | null>(type, {
    scalar: () => null,
    record: (_structure, recordType) => {
      const { partLabels, fullRowParts } = fieldTypePresentation[recordType];
      const fullRow: readonly string[] = fullRowParts;
      const labels: Record<string, string> = partLabels;
      return Object.entries(FIELD_STRUCTURES[recordType].parts).map(([key, leaf]) => ({
        key,
        label: labels[key],
        leaf,
        fullRow: fullRow.includes(key),
      }));
    },
    set: () => null,
  });

/**
 * Parts that read as one run rather than as separate items — "NY 00001", not "NY, 00001".
 *
 * This is the whole of what a composite's one-line form needs stated. Everything else
 * comes from the value schema's declaration order, so a part added to a type upstream
 * appears in the line on its own, without anyone knowing to come here. That was the point:
 * the previous version wrote each type's line out by hand, and a part left out of it was
 * collected, stored, exported and filtered on while being invisible in every summary —
 * a silent omission, which is the worst way for this to fail.
 *
 * Typed against the parts each type declares, so renaming or removing one upstream fails
 * the build here. Deliberately not exhaustive: a part nobody mentions is one that reads
 * perfectly well on its own, and requiring an entry for each would put the omission
 * problem straight back.
 */
export type CompositePartRuns = { [T in FieldType]?: ReadonlyArray<readonly PartsOf<T>[]> };

const fusedParts: CompositePartRuns = {
  address: [['state', 'postal_code']],
};

/**
 * A composite type's parts grouped into the runs its line is built from: declaration
 * order, with anything fused above kept together.
 *
 * A fused pair that is not adjacent in declaration order simply reads as two runs, so
 * reordering a type upstream costs a comma rather than a wrong sentence.
 */
function partRunsFor(type: FieldType): string[][] {
  const parts: string[] | null = partsOf(type);
  if (!parts) {
    return [];
  }

  const runOf = new Map<string, number>();
  const fused: ReadonlyArray<readonly string[]> = fusedParts[type] ?? [];
  fused.forEach((group, index) => {
    group.forEach((part) => runOf.set(part, index));
  });

  const runs: string[][] = [];
  let openRun: number | undefined;
  for (const part of parts) {
    const run = runOf.get(part);
    if (run !== undefined && run === openRun) {
      runs[runs.length - 1].push(part);
      continue;
    }
    runs.push([part]);
    openRun = run;
  }
  return runs;
}

// Resolved once: the catalog is static, and this is read for every row of a member list.
const partRuns = new Map(FIELD_TYPE_IDS.map((type) => [type, partRunsFor(type)]));

/**
 * A member's value for one field as a single readable line: the string itself for a
 * scalar, for a composite its parts joined the way that type reads — e.g.
 * "1 Main St, 12 apt B, New York, NY 00001, US" — and for a list the options picked. Missing
 * parts drop out, so a partial value still reads naturally.
 *
 * Empty string for a value that is not the shape its type declares: the type decides
 * which shape is readable, so a composite reads only from its parts and a scalar only
 * from text. Callers own their own placeholder, since "no value" reads differently in a
 * table cell than in a detail row.
 */
export const formatMemberCustomFieldValue = (
  field: Pick<MemberCustomField, 'type'>,
  value: unknown,
): string =>
  matchShape(field.type, {
    scalar: ({ leaf }) => (typeof value === 'string' ? memberCustomFieldLeafText(leaf, value) : ''),
    record: ({ parts }, type) => {
      if (!isRecordValue(value)) {
        return '';
      }

      const leaves: Record<string, Leaf | undefined> = parts;
      const readPart = (part: string): unknown => {
        const raw = value[part];
        const leaf = leaves[part];
        return leaf && typeof raw === 'string' ? memberCustomFieldLeafText(leaf, raw) : raw;
      };

      return (partRuns.get(type) ?? [])
        .map((run) =>
          run
            .map(readPart)
            .filter((part): part is string => typeof part === 'string' && part !== '')
            .join(' '),
        )
        .filter(Boolean)
        .join(', ');
    },
    // In the order the server reads them back, which is the field's own.
    set: () =>
      Array.isArray(value)
        ? value.filter((option): option is string => typeof option === 'string').join(', ')
        : '',
  });

const MemberCustomFieldList = z.array(MetafieldDefinitionSchema);
const MemberCustomFieldsResponse = z.object({ members_metafields: MemberCustomFieldList });

export type MemberCustomFieldsResponseType = z.output<typeof MemberCustomFieldsResponse>;
const readMemberCustomFieldsResponse = (raw: unknown) => MemberCustomFieldsResponse.parse(raw);

const dataType = 'MemberCustomFieldsResponseType';
// Exported so a screen can move the list in its own cache before the request lands —
// a drag that waits for a round-trip snaps back under the cursor.
export const memberCustomFieldsDataType = dataType;

/**
 * A response this build can't read, such as one naming a type added after it shipped, fails the
 * request rather than leaving the field out. Settings has to show every field to reorder the list,
 * and a hidden field still holds its name and a place under the site's limit.
 */
export const useBrowseMemberCustomFields = createQuery<MemberCustomField[]>({
  dataType,
  path: '/members/metafields/custom/',
  parseResponse: (raw) => readMemberCustomFieldsResponse(raw).members_metafields,
});

// Browse hides archived fields by default. Settings is the one surface that
// manages both, so it opts into every status through this variant rather than
// hand-writing the filter grammar in the view.
export const useBrowseMemberCustomFieldsIncludingArchived = (
  options?: Parameters<typeof useBrowseMemberCustomFields>[0],
) =>
  useBrowseMemberCustomFields({ ...options, searchParams: { filter: 'status:[active,archived]' } });

/**
 * Everything a new field is created from: its type with the settings that type takes. The backend
 * mints the key from the name.
 */
export type NewMemberCustomField = Pick<MemberCustomField, 'name' | 'access'> & TypedSettings;

/**
 * A change to one field, addressed by key. Anything omitted is left as it is. A list's settings
 * are stated whole, its options in order.
 */
export type MemberCustomFieldEdit = Pick<MemberCustomField, 'key'> &
  Partial<Pick<MemberCustomField, 'name' | 'status' | 'access'>> & {
    settings?: NonNullable<SettingsOf<FieldType>>;
  };

export const useCreateMemberCustomField = createMutation<
  MemberCustomFieldsResponseType,
  NewMemberCustomField
>({
  method: 'POST',
  path: () => '/members/metafields/custom/',
  body: (field) => ({ members_metafields: [field] }),
  parseResponse: readMemberCustomFieldsResponse,
  invalidateQueries: { dataType },
  // The created field is put into the cached lists as well as refetched, so a screen that
  // has just made one can use it in the same breath instead of waiting for a round trip or
  // keeping its own copy until one arrives. The refetch above remains the truth; this only
  // decides what is on screen until it lands.
  //
  // Appended, because the API assigns a new field the last position. Keyed de-dup because
  // the refetch may already have landed, and a list that does not hold the created field is
  // left alone: a browse filtered to active fields should not be handed an archived one, and
  // by the same token no list here is asked to take a field it did not ask for.
  updateQueries: {
    dataType,
    update: (newData, currentData) => {
      const current = MemberCustomFieldList.safeParse(currentData);
      if (!current.success) {
        return currentData;
      }
      const created = newData.members_metafields.filter(
        (field) => !current.data.some((existing) => existing.key === field.key),
      );
      return [...current.data, ...created];
    },
  },
});

// Keys are immutable after creation (the API rejects changes); `name`, `status` and
// `access` are the editable surface — a status flip to 'active' is how an archived
// field is reactivated, and an access change is what opens a field to members.
export const useEditMemberCustomField = createMutation<
  MemberCustomFieldsResponseType,
  MemberCustomFieldEdit
>({
  method: 'PUT',
  path: (field) => `/members/metafields/custom/${field.key}/`,
  parseResponse: readMemberCustomFieldsResponse,
  body: ({ key: _key, ...patch }) => ({ members_metafields: [patch] }),
  invalidateQueries: { dataType },
});

/**
 * Set the order of the whole list.
 *
 * Order is a property of the list rather than of a field — no definition carries a rank
 * — so it is stated by PUTting the collection in the order it should have. The payload
 * has to name every field the site has, archived ones included: the API rejects a list
 * that doesn't, which is what stops a client that loaded before a colleague added a
 * field from writing an order that was never true of the whole list.
 */
export const useReorderMemberCustomFields = createMutation<
  MemberCustomFieldsResponseType,
  MemberCustomField[]
>({
  method: 'PUT',
  path: () => '/members/metafields/custom/',
  body: (fields) => ({ members_metafields: fields.map(({ key }) => ({ key })) }),
  parseResponse: readMemberCustomFieldsResponse,
  // The response is the settled order, so it is written straight to the cached lists
  // rather than refetched. A reorder only succeeds when it named exactly the fields the
  // site has, so a success carries no news about the set — only about its order — and
  // there is nothing a GET would add.
  //
  // Several lists live under this data type, one per set of query params, and they do
  // not hold the same fields: Settings asked for every status, a member's details and
  // the importer asked for active fields only. So each is put into the new order rather
  // than replaced by the response, which would hand those two archived fields they are
  // written to assume they never see.
  updateQueries: {
    dataType,
    update: (newData, currentData) => {
      const current = MemberCustomFieldList.safeParse(currentData);
      if (!current.success) {
        return currentData;
      }
      const settledOrder = newData.members_metafields.map(({ key }) => key);
      return inOrderOf(settledOrder, current.data);
    },
  },
});

/**
 * A list of fields arranged to match an order given as keys, keeping whatever it holds.
 *
 * Takes keys rather than fields because an order is only ever a sequence of keys — which
 * is what the API is told, and what a screen holds while a drag settles.
 *
 * A field the order does not mention keeps to the end rather than jumping to the front,
 * which is where an unknown place would otherwise sort it.
 */
export const inOrderOf = (
  order: readonly string[],
  fields: MemberCustomField[],
): MemberCustomField[] => {
  const placeOf = new Map(order.map((key, place) => [key, place]));
  return [...fields].sort(
    (a, b) => (placeOf.get(a.key) ?? Infinity) - (placeOf.get(b.key) ?? Infinity),
  );
};

// DELETE permanently removes an archived field and its collected values;
// addressed by key. The API only allows it on an already-archived field —
// archiving and reactivating are separate status edits over PUT.
export const useDeleteMemberCustomField = createMutation<void, string>({
  method: 'DELETE',
  path: (key) => `/members/metafields/custom/${key}/`,
  invalidateQueries: { dataType },
});
