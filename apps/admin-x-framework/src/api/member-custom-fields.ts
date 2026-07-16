import {FIELD_TYPE_IDS, type FieldType} from '@tryghost/custom-field-types';
import {Meta, createMutation, createQuery, createQueryWithId} from '../utils/api/hooks';

export type MemberCustomField = {
    // Fields are addressed by their immutable key; the DB id is never exposed.
    key: string;
    name: string;
    // The same field-type enum the backend validates against, so admin and
    // server never drift on the set.
    type: FieldType;
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
    // Icon name, resolved by the rendering app's icon set (today that's the
    // admin-x-design-system set in Settings — the only surface showing type
    // icons). A name rather than a component keeps this catalog render-free.
    icon: string;
    // Which control collects/edits a value of this type
    input: 'text' | 'textarea' | 'address';
};

// Presentation for every field type in the shared catalog. The explicit
// Record<FieldType, ...> annotation keeps this exhaustive: adding a field type
// upstream fails to compile here until it has a presentation.
const fieldTypePresentation: Record<FieldType, Omit<MemberCustomFieldUserType, 'id'>> = {
    short_text: {label: 'Short text', icon: 'aa', input: 'text'},
    long_text: {label: 'Long text', icon: 'long-text', input: 'textarea'},
    address: {label: 'Address', icon: 'map-pin', input: 'address'}
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

// Keys are immutable after creation (the API rejects changes), so only `name`
// can be edited.
export const useEditMemberCustomField = createMutation<MemberCustomFieldsResponseType, Pick<MemberCustomField, 'key' | 'name'>>({
    method: 'PUT',
    path: field => `/members/custom_fields/${field.key}/`,
    body: ({name}) => ({members_custom_fields: [{name}]}),
    invalidateQueries: {dataType}
});

// Archiving a field (soft delete) keeps its key reserved; addressed by key.
export const useDeleteMemberCustomField = createMutation<void, string>({
    method: 'DELETE',
    path: key => `/members/custom_fields/${key}/`,
    invalidateQueries: {dataType}
});
