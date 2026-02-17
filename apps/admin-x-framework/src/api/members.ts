import {InfiniteData} from '@tanstack/react-query';
import {Meta, createInfiniteQuery, createMutation, createQuery, createQueryWithId} from '../utils/api/hooks';

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
    status: 'free' | 'paid' | 'comped';
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

// Infinite query for members list with virtual scrolling
export interface MembersInfiniteResponseType extends MembersResponseType {
    isEnd: boolean;
}

export const useBrowseMembersInfinite = createInfiniteQuery<MembersInfiniteResponseType>({
    dataType,
    path: '/members/',
    defaultSearchParams: {
        include: 'labels,tiers',
        limit: '50',
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

// Bulk operations
export interface BulkEditAction {
    type: 'addLabel' | 'removeLabel' | 'unsubscribe';
    meta?: {
        label?: {id: string};
    };
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

export const useBulkEditMembers = createMutation<
    BulkOperationResponseType,
    {filter: string; all?: boolean; action: BulkEditAction}
>({
    method: 'PUT',
    path: () => '/members/bulk/',
    body: ({action}) => ({
        bulk: {
            action: action.type,
            meta: action.meta || {}
        }
    }),
    searchParams: ({filter, all}) => {
        if (!all && !filter) {
            throw new Error('Bulk edit requires either a filter or all flag');
        }
        const params: Record<string, string> = {};
        if (all) {
            params.all = 'true';
        } else {
            params.filter = filter;
        }
        return params;
    },
    invalidateQueries: {dataType}
});

export const useBulkDeleteMembers = createMutation<
    BulkOperationResponseType,
    {filter: string; all?: boolean}
>({
    method: 'DELETE',
    path: () => '/members/',
    searchParams: ({filter, all}) => {
        if (!all && !filter) {
            throw new Error('Bulk delete requires either a filter or all flag');
        }
        const params: Record<string, string> = {};
        if (all) {
            params.all = 'true';
        } else {
            params.filter = filter;
        }
        return params;
    },
    invalidateQueries: {dataType}
});
