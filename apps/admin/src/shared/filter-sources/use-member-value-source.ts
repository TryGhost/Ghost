import {type Member, type MembersInfiniteResponseType, useBrowseMembersInfinite} from '@tryghost/admin-x-framework/api/members';
import {type ValueSource} from '@tryghost/shade/patterns';
import {createGhostBrowseValueSource} from './create-ghost-browse-value-source';
import {keepPreviousData} from '@tanstack/react-query';

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
    getMissingSelectedOption: value => ({
        value,
        label: `ID: ${value}`
    }),
    selectItems: data => data?.members,
    useQuery: ({enabled, searchParams}) => {
        return useBrowseMembersInfinite({
            enabled,
            placeholderData: keepPreviousData,
            searchParams
        });
    },
    toOption: toMemberOption
});

export function useMemberValueSource(): ValueSource<string> {
    return useRemoteMemberValueSource();
}
