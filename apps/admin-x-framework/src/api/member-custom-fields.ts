import {Meta, createMutation, createQuery, createQueryWithId} from '../utils/api/hooks';

export type MemberCustomFieldType = 'text';

export type MemberCustomField = {
    id: string;
    key: string;
    name: string;
    type: MemberCustomFieldType;
    created_at: string;
    updated_at: string | null;
};

// A member's values as they appear on the members API wire format: a sparse map
// keyed by field key. Only fields with a stored value are present; writing null
// clears a value.
export type MemberCustomFieldValues = Record<string, string | null>;

/**
 * The user-type catalog: the presentation layer over the API's storage types.
 *
 * The API stores one `type` string per field; this catalog owns what each type
 * means in the UI - label, icon, and which control collects a value. Admin
 * surfaces (settings list/modal, member detail) render from here so every
 * surface presents fields identically. The backend never sees any of this.
 *
 * Today the API only stores 'text', presented as "Short text". Offering more
 * user types (long text, email, ...) needs the backend to store which one a
 * field is (a wider type enum or a format column) - a field's record is the
 * pointer into this catalog, so anything that changes rendering must round-trip
 * through it.
 */
export type MemberCustomFieldUserType = {
    id: string;
    label: string;
    // The literal glyph shown in icon tiles (future types may need real icons;
    // keep this a plain string so apps decide how to render it)
    iconText: string;
    // The API storage type this user type maps to
    apiType: MemberCustomFieldType;
    // Which control collects/edits a value of this type
    input: 'text' | 'textarea';
    // Client-side cap for value inputs. Provisional until the server codec
    // enforces the same number - today the API accepts any length and only the
    // TEXT column (~64KB) bounds it, with a raw DB error rather than a 422.
    maxLength: number;
};

export const memberCustomFieldUserTypes: MemberCustomFieldUserType[] = [
    {id: 'text', label: 'Short text', iconText: 'Aa', apiType: 'text', input: 'text', maxLength: 255}
];

// Resolve the user type for a field loaded from the API. Falls back to the
// first entry so an unknown future type degrades to a rendered row, not a crash.
export const userTypeForField = (field: MemberCustomField): MemberCustomFieldUserType => {
    return memberCustomFieldUserTypes.find(userType => userType.apiType === field.type) || memberCustomFieldUserTypes[0];
};

export interface MemberCustomFieldsResponseType {
    meta?: Meta;
    member_custom_fields: MemberCustomField[];
}

const dataType = 'MemberCustomFieldsResponseType';

export const useBrowseMemberCustomFields = createQuery<MemberCustomFieldsResponseType>({
    dataType,
    path: '/members/custom_fields/'
});

export const getMemberCustomField = createQueryWithId<MemberCustomFieldsResponseType>({
    dataType,
    path: id => `/members/custom_fields/${id}/`
});

export const useCreateMemberCustomField = createMutation<MemberCustomFieldsResponseType, Pick<MemberCustomField, 'key' | 'name' | 'type'>>({
    method: 'POST',
    path: () => '/members/custom_fields/',
    body: field => ({member_custom_fields: [field]}),
    invalidateQueries: {dataType}
});

// Keys are immutable after creation (the API rejects changes), so only `name`
// can be edited.
export const useEditMemberCustomField = createMutation<MemberCustomFieldsResponseType, Pick<MemberCustomField, 'id' | 'name'>>({
    method: 'PUT',
    path: field => `/members/custom_fields/${field.id}/`,
    body: ({name}) => ({member_custom_fields: [{name}]}),
    invalidateQueries: {dataType}
});

// Deleting a field also deletes every member's stored value for it.
export const useDeleteMemberCustomField = createMutation<void, string>({
    method: 'DELETE',
    path: id => `/members/custom_fields/${id}/`,
    invalidateQueries: {dataType}
});
