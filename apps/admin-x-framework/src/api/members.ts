import {Meta, createMutation, createQuery, createQueryWithId} from '../utils/api/hooks';

export type Member = {
    id: string;
    transient_id: string;
    uuid: string;
    name?: string;
    email?: string;
    avatar_image?: string;
    last_seen_at: string | null;
    last_commented_at: string | null;
    can_comment?: boolean;
    commenting?: {
        disabled: boolean;
        disabled_reason?: string;
        disabled_until?: string;
    };
    created_at: string;
    updated_at: string;
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

export const getMember = createQueryWithId<MembersResponseType>({
    dataType,
    path: id => `/members/${id}/`
});

export const useDisableMemberCommenting = createMutation<
    MembersResponseType,
    {id: string; reason: string; hideComments?: boolean}
>({
    method: 'POST',
    path: ({id}) => `/members/${id}/commenting/disable`,
    body: ({reason, hideComments}) => ({
        reason,
        hide_comments: hideComments
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
