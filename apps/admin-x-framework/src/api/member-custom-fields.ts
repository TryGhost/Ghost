import {FIELD_TYPE_IDS, subFieldsOf, type FieldType, type PartsOf} from '@tryghost/custom-field-types';
import {csvColumnsForField} from '@tryghost/custom-field-types/csv';
import {Meta, createMutation, createQuery, createQueryWithId} from '../utils/api/hooks';

// Re-exported so the import mapping can recognise a custom_fields.* column (same reason
// as the re-exports below).
export {isCustomFieldColumn} from '@tryghost/custom-field-types/csv';

// Re-exported so admin apps can type address values and validate against the
// same schemas the server enforces, without a direct dependency on the shared
// catalog package — the framework is their surface for everything custom-fields.
export type {Address as MemberCustomFieldAddress} from '@tryghost/custom-field-types';
export {FIELD_TYPES as MEMBER_CUSTOM_FIELD_TYPES} from '@tryghost/custom-field-types';

export type MemberCustomField = {
    // Fields are addressed by their immutable key; the DB id is never exposed.
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
} & ([PartsOf<T>] extends [never] ? {subFields?: never} : {subFields: Record<PartsOf<T>, string>});

// Presentation for every field type in the shared catalog. The mapped type keeps this
// exhaustive: adding a field type upstream fails to compile here until it has one.
const fieldTypePresentation: {[T in FieldType]: FieldTypePresentation<T>} = {
    short_text: {label: 'Short text', input: 'text'},
    long_text: {label: 'Long text', input: 'textarea'},
    address: {
        label: 'Address',
        input: 'address',
        subFields: {
            line1: 'Address line 1',
            line2: 'Address line 2',
            city: 'City',
            state: 'State',
            postal_code: 'Postal code',
            country: 'Country'
        }
    }
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
export const memberCustomFieldUserTypes: MemberCustomFieldUserType[] =
    FIELD_TYPE_IDS.map(id => ({id, ...fieldTypePresentation[id]}));

// Resolve the presentation for a field type. Falls back to the first entry so an unknown
// future type degrades to a rendered row, not a crash.
export const userTypeForFieldType = (type: FieldType): MemberCustomFieldUserType => {
    return memberCustomFieldUserTypes.find(userType => userType.id === type) || memberCustomFieldUserTypes[0];
};

// As above, for a field loaded from the API.
export const userTypeForField = (field: MemberCustomField): MemberCustomFieldUserType => userTypeForFieldType(field.type);

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
 * writes, labelled for the field (and sub-field, for a composite). Column names come from
 * the shared codec the exporter writes and the importer reads, so a target is exactly a
 * round-tripping column rather than one hand-kept in sync.
 */
export const memberCustomFieldCsvColumns = (fields: MemberCustomField[]): MemberCustomFieldCsvColumn[] => {
    return fields.flatMap((field) => {
        const labels = partLabelsFor(field.type);
        return csvColumnsForField({key: field.key, type: field.type}).map(({column, subField}) => {
            const partLabel = subField === null ? undefined : labels[subField];
            return {
                value: column,
                fieldName: field.name,
                ...(partLabel === undefined ? {} : {partLabel}),
                label: partLabel === undefined ? field.name : `${field.name} (${partLabel})`,
                type: field.type
            };
        });
    });
};

/** One part of a composite field type: the key the value schema declares, and its label. */
export type MemberCustomFieldPart<T extends FieldType = FieldType> = {key: PartsOf<T>; label: string};

/**
 * The parts of a composite field type, or null for a scalar.
 *
 * Which parts exist, and in what order, comes from the value schema; naming them is this
 * catalog's job.
 */
export const memberCustomFieldParts = <T extends FieldType>(type: T): MemberCustomFieldPart<T>[] | null => {
    const partKeys = subFieldsOf(type);
    if (!partKeys) {
        return null;
    }
    const labels = partLabelsFor(type);
    return partKeys.map(key => ({key, label: labels[key]}));
};

export interface MemberCustomFieldsResponseType {
    meta?: Meta;
    members_custom_fields: MemberCustomField[];
}

const dataType = 'MemberCustomFieldsResponseType';
// Exported so a screen can move the list in its own cache before the request lands —
// a drag that waits for a round-trip snaps back under the cursor.
export const memberCustomFieldsDataType = dataType;

export const useBrowseMemberCustomFields = createQuery<MemberCustomFieldsResponseType>({
    dataType,
    path: '/members/custom_fields/'
});

// Browse hides archived fields by default. Settings is the one surface that
// manages both, so it opts into every status through this variant rather than
// hand-writing the filter grammar in the view.
export const useBrowseMemberCustomFieldsIncludingArchived = (
    options?: Parameters<typeof useBrowseMemberCustomFields>[0]
) => useBrowseMemberCustomFields({...options, searchParams: {filter: 'status:[active,archived]'}});

export const getMemberCustomField = createQueryWithId<MemberCustomFieldsResponseType>({
    dataType,
    path: key => `/members/custom_fields/${key}/`
});

// The backend mints the key from the name, so create takes just a name and a type.
export const useCreateMemberCustomField = createMutation<MemberCustomFieldsResponseType, Pick<MemberCustomField, 'name' | 'type'>>({
    method: 'POST',
    path: () => '/members/custom_fields/',
    body: field => ({members_custom_fields: [field]}),
    invalidateQueries: {dataType},
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
            if (!current?.members_custom_fields) {
                return currentData;
            }
            const created = newData.members_custom_fields.filter(
                field => !current.members_custom_fields.some(existing => existing.key === field.key)
            );
            return {...current, members_custom_fields: [...current.members_custom_fields, ...created]};
        }
    }
});

// Keys are immutable after creation (the API rejects changes); `name` and
// `status` are the editable surface — a status flip to 'active' is how an
// archived field is reactivated.
export const useEditMemberCustomField = createMutation<MemberCustomFieldsResponseType, Pick<MemberCustomField, 'key'> & Partial<Pick<MemberCustomField, 'name' | 'status'>>>({
    method: 'PUT',
    path: field => `/members/custom_fields/${field.key}/`,
    body: ({key: _key, ...patch}) => ({members_custom_fields: [patch]}),
    invalidateQueries: {dataType}
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
export const useReorderMemberCustomFields = createMutation<MemberCustomFieldsResponseType, MemberCustomField[]>({
    method: 'PUT',
    path: () => '/members/custom_fields/',
    body: fields => ({members_custom_fields: fields.map(({key}) => ({key}))}),
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
            if (!current?.members_custom_fields) {
                return currentData;
            }
            const settledOrder = newData.members_custom_fields.map(({key}) => key);
            return {...current, members_custom_fields: inOrderOf(settledOrder, current.members_custom_fields)};
        }
    }
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
export const inOrderOf = (order: readonly string[], fields: MemberCustomField[]): MemberCustomField[] => {
    const placeOf = new Map(order.map((key, place) => [key, place]));
    return [...fields].sort((a, b) => (placeOf.get(a.key) ?? Infinity) - (placeOf.get(b.key) ?? Infinity));
};

// DELETE permanently removes an archived field and its collected values;
// addressed by key. The API only allows it on an already-archived field —
// archiving and reactivating are separate status edits over PUT.
export const useDeleteMemberCustomField = createMutation<void, string>({
    method: 'DELETE',
    path: key => `/members/custom_fields/${key}/`,
    invalidateQueries: {dataType}
});
