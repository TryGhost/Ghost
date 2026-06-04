import {InfiniteData, useQueryClient} from '@tanstack/react-query';
import {useEffect} from 'react';
import {Meta, createInfiniteQuery, createMutation, createQuery, createQueryWithId} from '../utils/api/hooks';
import {apiUrl} from '../utils/api/fetch-api';

export type MemberLabel = {
    id: string;
    name: string;
    slug: string;
    created_at: string;
};

export type MemberTier = {
    id: string;
    name: string;
    slug: string;
    active: boolean;
    type: string;
};

export type MemberNewsletter = {
    id: string;
    uuid: string;
    name: string;
    slug: string;
    status: string;
};

export type MemberSubscription = {
    id: string;
    customer: {
        id: string;
        name: string | null;
        email: string;
    };
    plan: {
        id: string;
        nickname: string;
        interval: 'month' | 'year';
        currency: string;
        amount: number;
    };
    status: string;
    start_date: string;
    current_period_end: string;
    cancel_at_period_end: boolean;
    price: {
        id: string;
        price_id: string;
        nickname: string;
        amount: number;
        currency: string;
        type: string;
        interval: 'month' | 'year';
    };
    tier: MemberTier;
    offer: {
        id: string;
        name: string;
    } | null;
};

export type Member = {
    id: string;
    transient_id: string;
    uuid: string;
    name?: string;
    email?: string;
    avatar_image?: string;
    status: 'free' | 'paid' | 'comped' | 'gift';
    note?: string;
    subscribed: boolean;
    labels?: MemberLabel[];
    tiers?: MemberTier[];
    newsletters?: MemberNewsletter[];
    subscriptions?: MemberSubscription[];
    email_count?: number;
    email_opened_count?: number;
    email_open_rate?: number | null;
    // TODO: The server returns geolocation as a JSON-encoded string (not a parsed object).
    // Long term we should parse this on the server side and return a proper object.
    geolocation?: string | null;
    email_suppression?: {
        suppressed: boolean;
        info?: {
            reason: string;
            timestamp: string;
        };
    };
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
const membersPath = '/members/';

const memberCountSearchParams = {limit: '1'} as const;

export const getMemberCountQueryKey = () => [dataType, apiUrl(membersPath, memberCountSearchParams)] as const;

export const useBrowseMembers = createQuery<MembersResponseType>({
    dataType,
    path: membersPath
});

const useBrowseMemberCount = createQuery<MembersResponseType>({
    dataType,
    path: membersPath,
    defaultSearchParams: memberCountSearchParams
});

export function useMemberCount() {
    const {data} = useBrowseMemberCount();

    return data?.meta?.pagination.total;
}

export type NewMember = {
    email: string;
    name?: string | null;
};

export const useAddMember = createMutation<MembersResponseType, NewMember>({
    method: 'POST',
    path: () => '/members/',
    body: member => ({
        members: [member]
    }),
    invalidateQueries: {dataType}
});

export type ImportMembersImportLabel = {
    name: string;
    slug: string;
};

export type ImportMembersAcceptedResponseType = {
    meta: {
        originalImportSize: number;
        import_label?: ImportMembersImportLabel | null;
    };
};

export type ImportMembersCompleteResponseType = {
    meta: {
        originalImportSize?: number;
        stats: {
            imported: number;
            invalid?: Array<Record<string, string> & {error: string}>;
        };
        import_label?: ImportMembersImportLabel | null;
    };
};

export type ImportMembersResponseType = ImportMembersAcceptedResponseType | ImportMembersCompleteResponseType;

// The upload endpoint returns one of two success shapes (see the importCSV
// controller): a "complete" response carrying meta.stats (inline import), or an
// "accepted" response carrying only meta.originalImportSize (queued for background
// processing). We discriminate on the presence of meta.stats. The optional chain
// is deliberate - this guard validates an untrusted parsed response, so it returns
// false on a malformed payload rather than throwing.
export function isImportMembersCompleteResponse(response: ImportMembersResponseType): response is ImportMembersCompleteResponseType {
    return typeof (response as ImportMembersCompleteResponseType).meta?.stats?.imported === 'number';
}

export type ImportMembersPayload = {
    file: File;
    labels?: string[];
    mapping?: Record<string, string | null | undefined>;
};

function buildImportMembersFormData({file, labels = [], mapping = {}}: ImportMembersPayload) {
    const formData = new FormData();
    formData.append('membersfile', file);

    for (const label of labels) {
        formData.append('labels', label);
    }

    for (const [key, val] of Object.entries(mapping)) {
        if (val) {
            formData.append(`mapping[${key}]`, val);
        }
    }

    return formData;
}

export const useImportMembers = createMutation<ImportMembersResponseType, ImportMembersPayload>({
    method: 'POST',
    retry: false,
    path: () => '/members/upload/',
    body: buildImportMembersFormData,
    invalidateQueries: {dataType}
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

// Infinite query for members list with virtual scrolling
export interface MembersInfiniteResponseType extends MembersResponseType {
    isEnd: boolean;
}

const useBrowseMembersInfiniteQuery = createInfiniteQuery<MembersInfiniteResponseType>({
    dataType,
    path: membersPath,
    defaultSearchParams: {
        include: 'labels,tiers',
        limit: '100',
        order: 'created_at desc'
    },
    defaultNextPageParams: (lastPage, otherParams) => {
        if (!lastPage.meta?.pagination.next) {
            return undefined;
        }
        return {
            ...otherParams,
            page: lastPage.meta.pagination.next.toString()
        };
    },
    returnData: (originalData) => {
        const {pages} = originalData as InfiniteData<MembersResponseType>;
        const members = pages.flatMap(page => page.members);
        const meta = pages[pages.length - 1].meta;

        return {
            members,
            meta,
            isEnd: meta ? meta.pagination.pages === meta.pagination.page : true
        };
    }
});

type BrowseMembersInfiniteOptions = Parameters<typeof useBrowseMembersInfiniteQuery>[0];
type BrowseMembersInfiniteResult = ReturnType<typeof useBrowseMembersInfiniteQuery>;

// A members list response is a valid source for the *global* member total only
// when it isn't narrowed by a filter or search - otherwise its `total` reflects
// the filtered subset rather than every member.
function isUnfilteredMemberList(searchParams?: Record<string, string>) {
    return !searchParams?.filter && !searchParams?.search;
}

/**
 * Keeps the sidebar member-count cache consistent with the members list without
 * an extra request. The list hook owns this reconciliation because it is the
 * only place that knows both whether the query is filtered and how fresh its
 * data is.
 *
 * It only updates the count query if it already exists, and never overwrites a
 * count that was fetched more recently than the list.
 */
function useSyncMemberCountFromList(result: BrowseMembersInfiniteResult, searchParams?: Record<string, string>) {
    const queryClient = useQueryClient();
    const listTotal = result.data?.meta?.pagination?.total;
    // Derive a stable boolean so an inline `searchParams` object literal doesn't re-run the effect every render.
    const listIsUnfiltered = isUnfilteredMemberList(searchParams);

    useEffect(() => {
        const listTotalIsAuthoritative = listIsUnfiltered
            && !result.isError
            && !result.isPlaceholderData
            && !result.isPreviousData
            && typeof listTotal === 'number';

        if (!listTotalIsAuthoritative) {
            return;
        }

        const memberCountQueryKey = getMemberCountQueryKey();
        const memberCountQueryState = queryClient.getQueryState<MembersResponseType>(memberCountQueryKey);
        const memberCountData = memberCountQueryState?.data;
        const cachedPagination = memberCountData?.meta?.pagination;

        // Only update the count query if it already exists.
        if (!memberCountQueryState || !memberCountData || !cachedPagination) {
            return;
        }

        const sidebarCountMatchesList = cachedPagination.total === listTotal;
        // A more recent dedicated count fetch wins over an older list read.
        const listIsAtLeastAsFresh = memberCountQueryState.dataUpdatedAt <= result.dataUpdatedAt;

        if (sidebarCountMatchesList || !listIsAtLeastAsFresh) {
            return;
        }

        // Only `total` is read from the count query (via useMemberCount), so we patch just that and
        // leave the rest of the pagination block untouched rather than synthesise values nobody reads.
        // Stamp the entry with the list's fetch time so a genuinely newer count fetch still wins later.
        queryClient.setQueryData<MembersResponseType>(memberCountQueryKey, {
            ...memberCountData,
            meta: {
                ...memberCountData.meta,
                pagination: {
                    ...cachedPagination,
                    total: listTotal
                }
            }
        }, {updatedAt: result.dataUpdatedAt});
    }, [queryClient, listIsUnfiltered, listTotal, result.dataUpdatedAt, result.isError, result.isPlaceholderData, result.isPreviousData]);
}

export function useBrowseMembersInfinite(options: BrowseMembersInfiniteOptions = {}): BrowseMembersInfiniteResult {
    const result = useBrowseMembersInfiniteQuery(options);

    useSyncMemberCountFromList(result, options.searchParams);

    return result;
}

// Bulk operations
export interface BulkEditAction {
    type: 'addLabel' | 'removeLabel' | 'unsubscribe';
    meta?: {
        label?: {id: string};
    };
    newsletter?: string | null;
}

export interface BulkOperationResponseType {
    meta: {
        stats: {
            successful: number;
            unsuccessful: number;
        };
        unsuccessfulIds?: string[];
        errors?: Array<{id?: string; message: string}>;
    };
}

function buildBulkMemberSearchParams({filter, search, all}: {filter?: string; search?: string; all?: boolean}) {
    if (!all && !filter && !search) {
        throw new Error('Bulk operation requires a filter, search, or all flag');
    }

    const params: Record<string, string> = {};

    if (all) {
        params.all = 'true';
    }

    if (filter) {
        params.filter = filter;
    }

    if (search) {
        params.search = search;
    }

    return params;
}

export const useBulkEditMembers = createMutation<
    BulkOperationResponseType,
    {filter?: string; search?: string; all?: boolean; action: BulkEditAction}
>({
    method: 'PUT',
    path: () => '/members/bulk/',
    body: ({action}) => ({
        bulk: {
            action: action.type,
            meta: action.meta || {},
            newsletter: action.newsletter
        }
    }),
    searchParams: buildBulkMemberSearchParams,
    invalidateQueries: {dataType}
});

export const useBulkDeleteMembers = createMutation<
    BulkOperationResponseType,
    {filter?: string; search?: string; all?: boolean}
>({
    method: 'DELETE',
    path: () => '/members/',
    searchParams: buildBulkMemberSearchParams,
    invalidateQueries: {dataType}
});
