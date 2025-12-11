import {Meta, createQuery, createMutation} from '../utils/api/hooks';

export type Member = {
    id: string;
    name?: string | null;
    email?: string;
    avatar_image?: string | null;
    commenting_enabled?: boolean;
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

export const useBanMemberFromComments = createMutation<MembersResponseType, string>({
    method: 'POST',
    path: memberId => `/members/${memberId}/ban-from-comments/`,
    invalidateQueries: {dataType}
});

export const useUnbanMemberFromComments = createMutation<MembersResponseType, {memberId: string; restoreComments?: boolean}>({
    method: 'POST',
    path: ({memberId}) => `/members/${memberId}/unban-from-comments/`,
    body: ({restoreComments = true}) => ({
        restore_comments: restoreComments
    }),
    invalidateQueries: {dataType}
});
