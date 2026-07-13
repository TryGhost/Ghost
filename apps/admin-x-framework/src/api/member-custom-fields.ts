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
