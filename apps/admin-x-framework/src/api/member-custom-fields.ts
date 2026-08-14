import {FIELD_TYPE_IDS, type FieldType} from '@tryghost/custom-field-types';
import {Meta, createMutation, createQuery, createQueryWithId} from '../utils/api/hooks';

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
 * - its storage and validation. This catalog owns what it *looks like* in admin:
 * label, icon, and which control collects a value. Admin surfaces (settings
 * list/modal, member detail) render from here so every surface presents fields
 * identically. The backend never sees any of this.
 */
export type MemberCustomFieldUserType = {
    id: FieldType;
    label: string;
    // Which control collects/edits a value of this type
    input: 'text' | 'textarea' | 'address';
};

// Presentation for every field type in the shared catalog. The explicit
// Record<FieldType, ...> annotation keeps this exhaustive: adding a field type
// upstream fails to compile here until it has a presentation.
const fieldTypePresentation: Record<FieldType, Omit<MemberCustomFieldUserType, 'id'>> = {
    short_text: {label: 'Short text', input: 'text'},
    long_text: {label: 'Long text', input: 'textarea'},
    address: {label: 'Address', input: 'address'}
};

// The catalog in the shared catalog's declared order, so every admin surface
// offers and renders the field types in the same order.
export const memberCustomFieldUserTypes: MemberCustomFieldUserType[] =
    FIELD_TYPE_IDS.map(id => ({id, ...fieldTypePresentation[id]}));

// Resolve the user type for a field loaded from the API. Falls back to the
// first entry so an unknown future type degrades to a rendered row, not a crash.
export const userTypeForField = (field: MemberCustomField): MemberCustomFieldUserType => {
    return memberCustomFieldUserTypes.find(userType => userType.id === field.type) || memberCustomFieldUserTypes[0];
};

export interface MemberCustomFieldsResponseType {
    meta?: Meta;
    members_custom_fields: MemberCustomField[];
}

const dataType = 'MemberCustomFieldsResponseType';

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
    invalidateQueries: {dataType}
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

// DELETE permanently removes an archived field and its collected values;
// addressed by key. The API only allows it on an already-archived field —
// archiving and reactivating are separate status edits over PUT.
export const useDeleteMemberCustomField = createMutation<void, string>({
    method: 'DELETE',
    path: key => `/members/custom_fields/${key}/`,
    invalidateQueries: {dataType}
});
