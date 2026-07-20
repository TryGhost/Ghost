import {InfiniteData, useIsFetching, useQueryClient} from '@tanstack/react-query';
import {useEffect} from 'react';
import {Meta, createInfiniteQuery, createMutation, createQuery, createQueryWithId} from '../utils/api/hooks';
import {apiUrl} from '../utils/api/fetch-api';
import type {Address} from '@tryghost/custom-field-types';

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
    // Populated for complimentary / gift subscriptions; the tier expiry the admin
    // set when the comp was created, or the gift expiry from the redemption.
    expiry_at?: string | null;
};

export type MemberNewsletter = {
    id: string;
    uuid: string;
    name: string;
    slug: string;
    status: string;
};

export type MemberSubscription = {
    // Complimentary and gift subscriptions arrive from the members BREAD service
    // with `id: ''` — they're synthesised from the member's tier and carry no
    // Stripe subscription id. Paid ones always have a real Stripe id. The Ember
    // screen classifies via `!sub.id` (empty-string is falsy) combined with the
    // plan nickname.
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
    // Populated for subscriptions currently in a Stripe trial; used to render
    // "Free trial" + "Ends <date>" copy without leaning on the paid-price branch.
    trial_end_at?: string | null;
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
    attribution?: {
        id?: string | null;
        type?: string | null;
        url?: string | null;
        title?: string | null;
        referrer_source?: string | null;
        referrer_medium?: string | null;
        referrer_url?: string | null;
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
    current_subscription?: MemberSubscription | null;
    email_count?: number;
    email_opened_count?: number;
    email_open_rate?: number | null;
    // TODO: The server returns geolocation as a JSON-encoded string (not a parsed object).
    // Long term we should parse this on the server side and return a proper object.
    geolocation?: string | null;
    attribution?: {
        id?: string | null;
        type?: string | null;
        url?: string | null;
        title?: string | null;
        referrer_source?: string | null;
        referrer_medium?: string | null;
        referrer_url?: string | null;
    } | null;
    email_suppression?: {
        suppressed: boolean;
        info?: {
            reason: string;
            timestamp: string;
        };
    };
    last_seen_at: string | null;
    last_commented_at: string | null;
    // Custom field values keyed by field key, present only when requested via
    // `include=custom_fields` (behind the `membersCustomFields` flag). Values
    // are type-dependent: string for text-backed fields, an object for
    // composites like address — hence `unknown`; consumers narrow per field type.
    custom_fields?: Record<string, unknown>;
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

/**
 * True while any member query is in flight. Callers use this to hold a control
 * disabled across the refetch a mutation invalidates, so it can't be fired
 * again against state the screen hasn't re-rendered yet.
 *
 * Lives here because `dataType` is private to this module: reading the key from
 * a consumer means hand-copying the string, which then breaks silently and
 * without a type error if it ever changes.
 */
export const useMembersFetching = () => useIsFetching({queryKey: [dataType]}) > 0;

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
    note?: string | null;
    // Matched/created by name on the server, same as the edit payload.
    labels?: Array<{name: string; slug?: string}>;
    // Explicit initial subscription set. When omitted, the server falls back
    // to `subscribe_on_signup:true + visibility:members` newsletters
    // (`member-repository.js:460-464`). The Ember admin sends the same set
    // explicitly so the outcome doesn't drift if the server-side default
    // ever changes; the React admin now matches.
    newsletters?: Array<{id: string}>;
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
    }, [queryClient, listIsUnfiltered, listTotal, result.dataUpdatedAt, result.isError, result.isPlaceholderData]);
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

// -----------------------------------------------------------------------------
// Single-member detail-screen operations
// -----------------------------------------------------------------------------

// Labels are matched/created by name+slug, newsletters and tiers by id. `tiers`
// carries complimentary-subscription assignments (with optional expiry); passing
// a shorter list removes the omitted comp tiers. `include=tiers` mirrors the
// Ember save so the response carries the refreshed tier list.
export interface EditMemberData {
    id: string;
    name?: string;
    email?: string;
    note?: string | null;
    subscribed?: boolean;
    labels?: Array<{name: string; slug?: string}>;
    newsletters?: Array<{id: string}>;
    tiers?: Array<{id: string; expiry_at?: string | null}>;
    // Merge semantics: only the keys present are written; `null` clears a
    // value. Values are strings for text-backed fields and composite objects
    // for address (Partial because a draft mid-edit may hold an incomplete
    // address — the server validates completeness, not this type). Requires
    // the `membersCustomFields` flag server-side.
    custom_fields?: Record<string, string | Partial<Address> | null>;
}

export const useEditMember = createMutation<MembersResponseType, EditMemberData>({
    method: 'PUT',
    path: ({id}) => `/members/${id}/`,
    // `custom_fields` is asked back only when the payload writes it, so the
    // request stays valid on sites where the flag (and the include) is off.
    searchParams: payload => ({include: payload.custom_fields ? 'tiers,custom_fields' : 'tiers'}),
    body: ({id, ...rest}) => ({members: [{id, ...rest}]}),
    invalidateQueries: {dataType}
});

export const useDeleteMember = createMutation<void, {id: string; cancel?: boolean}>({
    method: 'DELETE',
    path: ({id}) => `/members/${id}/`,
    searchParams: ({cancel}) => ({cancel: cancel ? 'true' : 'false'}),
    invalidateQueries: {dataType}
});

export interface MemberSigninUrlResponseType {
    member_id: string;
    url: string;
}

// The Admin API wraps the controller payload in the `member_signin_urls` array
// envelope (see `member-signin-urls.js` + framework serializer). Unwrap here so
// consumers get the flat `{member_id, url}` object they actually want.
export const getMemberSigninUrl = createQueryWithId<MemberSigninUrlResponseType>({
    dataType: 'MemberSigninUrlResponseType',
    path: id => `/members/${id}/signin_urls/`,
    returnData: (originalData) => {
        const envelope = originalData as {member_signin_urls?: MemberSigninUrlResponseType[]};
        return envelope.member_signin_urls?.[0] ?? {member_id: '', url: ''};
    }
});

export const useMemberLogout = createMutation<void, {id: string}>({
    method: 'DELETE',
    path: ({id}) => `/members/${id}/sessions/`,
    invalidateQueries: {dataType}
});

// cancel_at_period_end true=cancel / false=continue; status:'canceled' is used by
// the complimentary flow to end an active paid subscription before comping.
// The two are mutually exclusive — either you're toggling the soft cancel flag OR
// you're hard-canceling. A discriminated union prevents callers from accidentally
// setting both at once (which the request body would silently send together).
interface EditMemberSubscriptionBase {
    memberId: string;
    subscriptionId: string;
}
export type EditMemberSubscriptionData =
    | (EditMemberSubscriptionBase & {cancelAtPeriodEnd: boolean; status?: undefined})
    | (EditMemberSubscriptionBase & {status: 'canceled'; cancelAtPeriodEnd?: undefined});

export const useEditMemberSubscription = createMutation<MembersResponseType, EditMemberSubscriptionData>({
    method: 'PUT',
    path: ({memberId, subscriptionId}) => `/members/${memberId}/subscriptions/${subscriptionId}/`,
    body: ({cancelAtPeriodEnd, status}) => ({
        ...(cancelAtPeriodEnd !== undefined ? {cancel_at_period_end: cancelAtPeriodEnd} : {}),
        ...(status ? {status} : {})
    }),
    invalidateQueries: {dataType}
});

export const useRemoveMemberEmailSuppression = createMutation<void, {id: string}>({
    method: 'DELETE',
    path: ({id}) => `/members/${id}/suppression/`,
    invalidateQueries: {dataType}
});

// -----------------------------------------------------------------------------
// Per-member activity feed (GET /members/events)
// -----------------------------------------------------------------------------

export interface MemberActivityEventMember {
    id: string;
    uuid: string;
    name: string | null;
    email: string;
    avatar_image: string | null;
}

// The feed returns heterogeneous event types (signup, subscription, email,
// click, comment, feedback, …); `data` is narrowed per-type at the render layer.
// `data.created_at` is the pagination cursor field and is present on every event.
export interface MemberActivityEvent {
    type: string;
    data: {
        created_at?: string;
        member?: MemberActivityEventMember | null;
        [key: string]: unknown;
    };
}

export interface MemberActivityFeedResponseType {
    events: MemberActivityEvent[];
    meta?: Meta;
}

export interface MemberActivityFeedInfiniteResponseType extends MemberActivityFeedResponseType {
    isEnd: boolean;
}

const MEMBER_ACTIVITY_LIMIT = '20';

// The events endpoint paginates by cursor rather than page number: each request
// asks for events older than a UTC `YYYY-MM-DD HH:mm:ss` timestamp taken from the
// last event of the previous page (events are ordered created_at desc).
//
// KNOWN LIMITATION: the cursor is `created_at`-only, without the id tie-breaker
// Ember's version added (`+id:<'<lastId>'`). Two events emitted in the same
// second on a page boundary can be skipped from the paginated list. The current
// consumer (`MemberActivityFeed` in `apps/posts`) only fetches 5 events and
// never calls `fetchNextPage`, so this is not exploitable today; add an id
// secondary cursor before another screen starts paginating.
function memberEventsCursor(events: MemberActivityEvent[]): string | undefined {
    const createdAt = events[events.length - 1]?.data?.created_at;
    if (!createdAt) {
        return undefined;
    }
    return new Date(createdAt).toISOString().slice(0, 19).replace('T', ' ');
}

function buildMemberEventsFilter(memberId: string): string {
    return `data.member_id:'${memberId}'`;
}

const useMemberActivityFeedQuery = createInfiniteQuery<MemberActivityFeedInfiniteResponseType>({
    dataType: 'MemberActivityFeedResponseType',
    path: '/members/events/',
    defaultSearchParams: {limit: MEMBER_ACTIVITY_LIMIT},
    defaultNextPageParams: (lastPage, otherParams) => {
        const limit = Number(otherParams.limit ?? MEMBER_ACTIVITY_LIMIT);
        const cursor = memberEventsCursor(lastPage.events);
        // Stop when the last page wasn't full or we can't advance the cursor.
        if (!cursor || lastPage.events.length < limit) {
            return undefined;
        }
        // otherParams.filter is the base member filter (no cursor) — rebuild with it.
        return {
            ...otherParams,
            filter: `data.created_at:<'${cursor}'+${otherParams.filter ?? ''}`
        };
    },
    returnData: (originalData) => {
        const {pages} = originalData as InfiniteData<MemberActivityFeedResponseType>;
        const events = pages.flatMap(page => page.events);
        const lastPage = pages[pages.length - 1];
        // Use the actual page limit echoed back in the server-side pagination
        // meta so callers that override the default (e.g. `useMemberActivityFeed`
        // passes `limit: '5'` for the sidebar preview) don't get a premature
        // `isEnd=true` on a full page of results.
        const paginationLimit = lastPage?.meta?.pagination?.limit;
        const effectiveLimit = typeof paginationLimit === 'number' ? paginationLimit : Number(MEMBER_ACTIVITY_LIMIT);
        return {
            events,
            meta: lastPage?.meta,
            isEnd: (lastPage?.events.length ?? 0) < effectiveLimit
        };
    }
});

export function useMemberActivityFeed(memberId: string, options: {enabled?: boolean; limit?: string} = {}) {
    const {limit = MEMBER_ACTIVITY_LIMIT, enabled} = options;
    return useMemberActivityFeedQuery({
        searchParams: {
            filter: buildMemberEventsFilter(memberId),
            limit
        },
        ...(enabled !== undefined ? {enabled} : {})
    });
}
