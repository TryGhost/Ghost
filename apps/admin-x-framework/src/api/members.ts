import {Meta, createMutation, createQuery} from '../utils/api/hooks';

export type Member = {
    id: string;
    name?: string;
    email?: string;
    avatar_image?: string;
    can_comment?: boolean;
};

export interface MembersResponseType {
    meta?: Meta
    members: Member[];
}

const dataType = 'MembersResponseType';

export const useBrowseMembers = createQuery<MembersResponseType>({
    dataType,
    path: '/members/'
});

export const useDisableMemberCommenting = createMutation<
    MembersResponseType,
    {id: string; reason: string}
>({
    method: 'POST',
    path: ({id}) => `/members/${id}/commenting/disable`,
    body: ({reason}) => ({
        reason
    }),
    invalidateQueries: {
        dataType: 'CommentsResponseType'
    }
});

export const useEnableMemberCommenting = createMutation<
    MembersResponseType,
    {id: string}
>({
    method: 'POST',
    path: ({id}) => `/members/${id}/commenting/enable`,
    body: () => ({}),
    invalidateQueries: {
        dataType: 'CommentsResponseType'
    }
});
