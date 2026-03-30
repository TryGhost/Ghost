import {Member, MembersInfiniteResponseType, useBrowseMembersInfinite} from '@tryghost/admin-x-framework/api/members';
import {ValueSource} from '@tryghost/shade';
import {createGhostBrowseValueSource} from './create-ghost-browse-value-source';

function toMemberOption(member: Member) {
    return {
        value: member.id,
        label: member.name || 'Unknown name',
        detail: member.email ?? '(Unknown email)'
    };
}

const useRemoteMemberValueSource = createGhostBrowseValueSource<Member, MembersInfiniteResponseType>({
    id: 'posts.members.remote',
    buildBrowseSearchParams: query => ({
        limit: '100',
        order: 'created_at DESC',
        ...(query ? {search: query} : {})
    }),
    selectItems: data => data?.members,
    useQuery: ({enabled, searchParams}) => {
        return useBrowseMembersInfinite({
            enabled,
            keepPreviousData: true,
            searchParams
        });
    },
    toOption: toMemberOption
});

export function useMemberValueSource(): ValueSource<string> {
    return useRemoteMemberValueSource();
}
