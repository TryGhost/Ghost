import {
  FIELD_TYPES,
  FIELD_TYPE_IDS,
  partTypesOf,
  subFieldsOf,
  type FieldKind,
  type FieldType,
  type PartType,
  type PartsOf,
} from '@tryghost/custom-field-types';
import { csvColumnsForField } from '@tryghost/custom-field-types/csv';
import { Meta, createMutation, createQuery } from '../utils/api/hooks';

// Re-exported so the import mapping can recognize a custom_fields.* column (same reason
// as the re-exports below).
export { isCustomFieldColumn } from '@tryghost/custom-field-types/csv';

// Re-exported so admin apps can type address values and validate against the
// same schemas the server enforces, without a direct dependency on the shared
// catalog package — the framework is their surface for everything custom-fields.
export type { Address as MemberCustomFieldAddress } from '@tryghost/custom-field-types';
export { FIELD_TYPES as MEMBER_CUSTOM_FIELD_TYPES } from '@tryghost/custom-field-types';
export { FIELD_KINDS as MEMBER_CUSTOM_FIELD_KINDS } from '@tryghost/custom-field-types';
export type { FieldKind as MemberCustomFieldKind } from '@tryghost/custom-field-types';

export type MemberCustomField = {
  // The namespace that declared the field — data from the API, never assumed.
  // Every field a publisher defines arrives in `custom`; ids, columns and value
  // lookups all derive from this so other namespaces flow through untouched.
  namespace: string;
  // Fields are addressed by their namespace and immutable key; the DB id is never exposed.
  key: string;
  name: string;
  // The same field-type enum the backend validates against, so admin and
  // server never drift on the set.
  type: FieldType;
  // Browse hides archived fields by default (most surfaces only want active
  // ones); Settings opts in via filter and splits on this.
  status: 'active' | 'archived';
  created_at: string;
  updated_at: string | null;
};

/**
 * The user-type catalog: the presentation layer over the shared field types.
 *
 * The shared catalog (@tryghost/custom-field-types) owns what a field type *is*
 * - its storage and validation. This catalog owns what a publisher is told it is:
 * its name, and which control collects a value. Admin surfaces (settings
 * list/modal, member detail) render from here so every surface presents fields
 * identically. The backend never sees any of this.
 *
 * The icon is not here: it is a component, so it sits with admin's, under the same type ids.
 */
export type MemberCustomFieldUserType = {
  id: FieldType;
  label: string;
  // Which control collects/edits a value of this type
  input: 'text' | 'textarea' | 'address';
};

/**
 * How one field type is presented, constrained by what its value is: a composite names
 * every part its schema declares and no others, a scalar names none.
 *
 * The shared catalog owns which parts exist; this one owns what they are called, so adding,
 * removing or renaming a part upstream fails the build here rather than reaching a publisher
 * as a raw key. Enforced against a literal, which is how the catalog below is written; a
 * pre-widened `Record<string, string>` would satisfy it.
 */
export type FieldTypePresentation<T extends FieldType> = {
  label: string;
  input: MemberCustomFieldUserType['input'];
} & ([PartsOf<T>] extends [never]
  ? { subFields?: never }
  : { subFields: Record<PartsOf<T>, string> });

// Presentation for every field type in the shared catalog. The mapped type keeps this
// exhaustive: adding a field type upstream fails to compile here until it has one.
const fieldTypePresentation: { [T in FieldType]: FieldTypePresentation<T> } = {
  short_text: { label: 'Short text', input: 'text' },
  long_text: { label: 'Long text', input: 'textarea' },
  address: {
    label: 'Address',
    input: 'address',
    subFields: {
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
 * A type's part labels, keyed by part; empty for a type with no parts, and for one this
 * build has never heard of.
 *
 * Total for every key the value schema declares, which is the only kind of key that
 * reaches it: `FieldTypePresentation` refuses to compile a catalog missing one.
 */
const partLabelsFor = (type: FieldType): Record<string, string> => {
  const labels: Record<string, string> | undefined = fieldTypePresentation[type]?.subFields;
  return labels ?? {};
};

// The catalog in the shared catalog's declared order, so every admin surface
// offers and renders the field types in the same order.
export const memberCustomFieldUserTypes: MemberCustomFieldUserType[] = FIELD_TYPE_IDS.map((id) => ({
  id,
  ...fieldTypePresentation[id],
}));

// Resolve the presentation for a field type. Falls back to the first entry so an unknown
// future type degrades to a rendered row, not a crash.
export const userTypeForFieldType = (type: FieldType): MemberCustomFieldUserType => {
  return (
    memberCustomFieldUserTypes.find((userType) => userType.id === type) ||
    memberCustomFieldUserTypes[0]
  );
};

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
 * writes, labeled for the field (and sub-field, for a composite). Column names come from
 * the shared codec the exporter writes and the importer reads, so a target is exactly a
 * round-tripping column rather than one hand-kept in sync.
 */
export const memberCustomFieldCsvColumns = (
  fields: MemberCustomField[],
): MemberCustomFieldCsvColumn[] => {
  return fields.flatMap((field) => {
    const labels = partLabelsFor(field.type);
    return csvColumnsForField({ namespace: field.namespace, key: field.key, type: field.type }).map(
      ({ column, subField }) => {
        const partLabel = subField === null ? undefined : labels[subField];
        return {
          value: column,
          fieldName: field.name,
          ...(partLabel === undefined ? {} : { partLabel }),
          label: partLabel === undefined ? field.name : `${field.name} (${partLabel})`,
          type: field.type,
        };
      },
    );
  });
};

export type { PartType as MemberCustomFieldPartType } from '@tryghost/custom-field-types';

/** One part of a composite field type: the key the value schema declares, its label, and its declared type. */
export type MemberCustomFieldPart<T extends FieldType = FieldType> = {
  key: PartsOf<T>;
  label: string;
  type: PartType;
};

/**
 * The parts of a composite field type, or null for a scalar.
 *
 * Which parts exist, and in what order, comes from the value schema; naming them is this
 * catalog's job.
 */
export const memberCustomFieldParts = <T extends FieldType>(
  type: T,
): MemberCustomFieldPart<T>[] | null => {
  const partKeys = subFieldsOf(type);
  const partTypes = partTypesOf(type);
  if (!partKeys || !partTypes) {
    return null;
  }
  const labels = partLabelsFor(type);
  return partKeys.map((key) => ({ key, label: labels[key], type: partTypes[key] }));
};

/**
 * A value as the record of parts a composite reads from, and nothing otherwise.
 *
 * A predicate rather than an assertion: the same checks either way, but this one hands
 * the narrowing to the compiler rather than overriding it, so a formatter below cannot be
 * reached by a value nobody looked at.
 */
const isPartRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

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
  const parts: string[] | null = subFieldsOf(type);
  if (!parts) {
    return [];
  }

  const runOf = new Map<string, number>();
  ((fusedParts[type] ?? []) as ReadonlyArray<readonly string[]>).forEach((group, index) => {
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
const partRuns = Object.fromEntries(
  FIELD_TYPE_IDS.map((type) => [type, partRunsFor(type)]),
) as Record<FieldType, string[][]>;

/**
 * A member's value for one field as a single readable line: the string itself for a
 * scalar, and for a composite its parts joined the way that type reads — e.g.
 * "1 Main St, 12 apt B, New York, NY 00001, US". Missing parts drop out, so a partial
 * value still reads naturally.
 *
 * Empty string for a value that is not the shape its type declares: the type decides
 * which shape is readable, so a composite reads only from its parts and a scalar only
 * from text. Callers own their own placeholder, since "no value" reads differently in a
 * table cell than in a detail row.
 */
export const formatMemberCustomFieldValue = (type: FieldType, value: unknown): string => {
  // Null for a scalar, and for a type this build has never heard of — both of which read
  // as text or as nothing.
  if (subFieldsOf(type) === null) {
    return typeof value === 'string' ? value : '';
  }

  if (!isPartRecord(value)) {
    return '';
  }

  return (partRuns[type] ?? [])
    .map((run) =>
      run
        .map((part) => value[part])
        .filter((part): part is string => typeof part === 'string' && part !== '')
        .join(' '),
    )
    .filter(Boolean)
    .join(', ');
};

export const memberCustomFieldKind = (type: FieldType): FieldKind => FIELD_TYPES[type].kind;

// The wire envelope. It stays inside this file: hooks unwrap it, so no consumer ever
// reads a response key — the wire shape has exactly one owner.
export interface MemberCustomFieldsResponseType {
  meta?: Meta;
  members_metafields: MemberCustomField[];
}

const dataType = 'MemberCustomFieldsResponseType';
// Exported so a screen can move the list in its own cache before the request lands —
// a drag that waits for a round-trip snaps back under the cursor.
export const memberCustomFieldsDataType = dataType;

export const useBrowseMemberCustomFields = createQuery<MemberCustomField[]>({
  dataType,
  path: '/members/metafields/custom/',
  returnData: (raw) => (raw as MemberCustomFieldsResponseType).members_metafields,
});

// Browse hides archived fields by default. Settings is the one surface that
// manages both, so it opts into every status through this variant rather than
// hand-writing the filter grammar in the view.
export const useBrowseMemberCustomFieldsIncludingArchived = (
  options?: Parameters<typeof useBrowseMemberCustomFields>[0],
) =>
  useBrowseMemberCustomFields({ ...options, searchParams: { filter: 'status:[active,archived]' } });

// The backend mints the key from the name, so create takes just a name and a type.
export const useCreateMemberCustomField = createMutation<
  MemberCustomFieldsResponseType,
  Pick<MemberCustomField, 'name' | 'type'>
>({
  method: 'POST',
  path: () => '/members/metafields/custom/',
  body: (field) => ({ members_metafields: [field] }),
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
    emberUpdateType: 'skip',
    update: (newData, currentData) => {
      const current = currentData as MemberCustomFieldsResponseType | undefined;
      if (!current?.members_metafields) {
        return currentData;
      }
      const created = newData.members_metafields.filter(
        (field) => !current.members_metafields.some((existing) => existing.key === field.key),
      );
      return { ...current, members_metafields: [...current.members_metafields, ...created] };
    },
  },
});

// Keys are immutable after creation (the API rejects changes); `name` and
// `status` are the editable surface — a status flip to 'active' is how an
// archived field is reactivated.
export const useEditMemberCustomField = createMutation<
  MemberCustomFieldsResponseType,
  Pick<MemberCustomField, 'key'> & Partial<Pick<MemberCustomField, 'name' | 'status'>>
>({
  method: 'PUT',
  path: (field) => `/members/metafields/custom/${field.key}/`,
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
    emberUpdateType: 'skip',
    update: (newData, currentData) => {
      const current = currentData as MemberCustomFieldsResponseType | undefined;
      if (!current?.members_metafields) {
        return currentData;
      }
      const settledOrder = newData.members_metafields.map(({ key }) => key);
      return {
        ...current,
        members_metafields: inOrderOf(settledOrder, current.members_metafields),
      };
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
