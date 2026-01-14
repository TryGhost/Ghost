import {InfiniteData} from '@tanstack/react-query';
import {Meta, createInfiniteQuery, createMutation} from '../utils/api/hooks';
import {downloadFromEndpoint} from '../utils/helpers';

export type Member = {
    id: string;
    uuid?: string;
    email: string;
    name?: string;
    note?: string;
    geolocation?: string | null;
    subscribed?: boolean;
    created_at: string;
    updated_at: string;
    labels?: {
        id: string;
        name: string;
        slug: string;
        created_at: string;
        updated_at: string;
    }[];
    avatar_image?: string;
    comped?: boolean;
    status: 'free' | 'paid' | 'comped';
    last_seen_at?: string | null;
    email_count?: number;
    email_opened_count?: number;
    email_open_rate?: number | null;
    attribution?: {
        id?: string | null;
        url?: string | null;
        title?: string | null;
        referrer_source?: string | null;
        referrer_medium?: string | null;
        referrer_url?: string | null;
    };
    tiers?: {
        id: string;
        name: string;
        slug: string;
        active: boolean;
        welcome_page_url?: string | null;
        visibility?: string;
        trial_days?: number;
        description?: string | null;
        type: string; // 'paid' | 'free'
        currency?: string | null;
        monthly_price?: number | null;
        yearly_price?: number | null;
        created_at?: string;
        updated_at?: string;
        expiry_at?: string; // This might be on the member_product pivot? Admin API returns tiers array.
    }[];
    newsletters?: {
        id: string;
        name: string;
        description: string | null;
        status: string;
    }[];
};

export interface MembersResponseType {
    meta?: Meta;
    members: Member[];
}

const dataType = 'MembersResponseType';

export const useBrowseMembersQuery = createInfiniteQuery<MembersResponseType>({
    dataType,
    path: '/members/',
    defaultNextPageParams: (lastPage, otherParams) => (lastPage.meta?.pagination.next
        ? {
            ...otherParams,
            page: (lastPage.meta?.pagination.next || 1).toString()
        }
        : undefined),
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

export const useBrowseMembers = ({
    searchParams,
    ...args
}: { searchParams?: Record<string, string> } & Parameters<
    typeof useBrowseMembersQuery
>[0]) => {
    return useBrowseMembersQuery({
        ...args,
        searchParams: {
            limit: '100',
            order: 'created_at desc',
            ...searchParams
        }
    });
};

export const useImportMembers = createMutation<MembersResponseType, File>({
    method: 'POST',
    path: () => '/members/upload/',
    body: (file) => {
        const formData = new FormData();
        formData.append('membersfile', file);
        return formData;
    }
});

export const exportMembers = (searchParams: URLSearchParams) => downloadFromEndpoint(`/members/upload/?${searchParams.toString()}`);

interface BulkActionPayload {
    all?: boolean;
    search?: string;
    filter?: string;
    ids?: string[];
}

interface LabelActionPayload extends BulkActionPayload {
    labelId: string;
}

export const useBulkDeleteMembers = createMutation<void, BulkActionPayload>({
    method: 'DELETE',
    path: () => '/members/',
    searchParams: (payload: BulkActionPayload) => {
        const params: Record<string, string> = {};
        if (payload.all) {
            params.all = 'true';
            if (payload.search) {
                params.search = payload.search;
            }
            if (payload.filter) {
                params.filter = payload.filter;
            }
        } else if (payload.ids) {
            params.filter = `id:[${payload.ids.join(',')}]`;
        }
        return params;
    },
    invalidateQueries: {dataType: 'MembersResponseType'}
});

export const useBulkAddLabel = createMutation<void, LabelActionPayload>({
    method: 'PUT',
    path: () => '/members/bulk/',
    body: (payload: LabelActionPayload) => ({
        action: 'addLabel',
        meta: {label: {id: payload.labelId}},
        all: payload.all,
        search: payload.search,
        filter: payload.all
            ? payload.filter
            : payload.ids
                ? `id:[${payload.ids.join(',')}]`
                : undefined
    }),
    invalidateQueries: {dataType: 'MembersResponseType'}
});

export const useBulkRemoveLabel = createMutation<void, LabelActionPayload>({
    method: 'PUT',
    path: () => '/members/bulk/',
    body: (payload: LabelActionPayload) => ({
        action: 'removeLabel',
        meta: {label: {id: payload.labelId}},
        all: payload.all,
        search: payload.search,
        filter: payload.all
            ? payload.filter
            : payload.ids
                ? `id:[${payload.ids.join(',')}]`
                : undefined
    }),
    invalidateQueries: {dataType: 'MembersResponseType'}
});

export const useBulkUnsubscribe = createMutation<void, BulkActionPayload>({
    method: 'PUT',
    path: () => '/members/bulk/',
    body: (payload: BulkActionPayload) => ({
        action: 'unsubscribe',
        all: payload.all,
        search: payload.search,
        filter: payload.all
            ? payload.filter
            : payload.ids
                ? `id:[${payload.ids.join(',')}]`
                : undefined
    }),
    invalidateQueries: {dataType: 'MembersResponseType'}
});
