export type PostsResource = 'posts' | 'pages';

export type PostsListType = 'draft' | 'published' | 'scheduled' | 'sent' | 'featured';

export interface PostsListParams {
    type: PostsListType | null;
    visibility: string | null;
    author: string | null;
    tag: string | null;
    order: string | null;
}

const POST_TYPES: string[] = ['draft', 'published', 'scheduled', 'sent', 'featured'];
const PAGE_TYPES: string[] = ['draft', 'published', 'scheduled', 'featured'];
const VISIBILITIES: string[] = ['public', 'members', '[paid,tiers]'];
const ORDERS: string[] = ['published_at asc', 'updated_at desc'];

export function parsePostsListParams(searchParams: URLSearchParams, resource: PostsResource): PostsListParams {
    const validTypes = resource === 'pages' ? PAGE_TYPES : POST_TYPES;
    const rawType = searchParams.get('type');
    const rawVisibility = searchParams.get('visibility');
    const rawOrder = searchParams.get('order');

    return {
        type: rawType && validTypes.includes(rawType) ? (rawType as PostsListType) : null,
        visibility: rawVisibility && VISIBILITIES.includes(rawVisibility) ? rawVisibility : null,
        author: searchParams.get('author'),
        tag: searchParams.get('tag'),
        order: rawOrder && ORDERS.includes(rawOrder) ? rawOrder : null
    };
}

export type PostsSectionKey = 'scheduled' | 'drafts' | 'published';

export interface PostsSectionQuery {
    filter: string;
    order: string;
}

export interface PostsListQueries {
    sections: Partial<Record<PostsSectionKey, PostsSectionQuery>>;
    /** NQL filter matching everything currently shown, used for inverted selections (Ember's `allFilter`) */
    allFilter: string;
}

/**
 * Builds the per-section browse queries (Ember parity: scheduled, drafts,
 * published+sent) plus the combined `allFilter` for the current URL params.
 */
export function getPostsListQueries({params, resource, forcedAuthorSlug}: {
    params: PostsListParams;
    resource: PostsResource;
    forcedAuthorSlug?: string;
}): PostsListQueries {
    const statusUnion = resource === 'pages' ? '[draft,scheduled,published]' : '[draft,scheduled,published,sent]';

    const rest: string[] = [];
    if (params.type === 'featured') {
        rest.push('featured:true');
    }
    if (params.visibility) {
        rest.push(`visibility:${params.visibility}`);
    }
    const authorSlug = forcedAuthorSlug ?? params.author;
    if (authorSlug) {
        rest.push(`authors:${authorSlug}`);
    }
    if (params.tag) {
        rest.push(`tag:${params.tag}`);
    }

    const withRest = (statusFilter: string) => [statusFilter, ...rest].join('+');

    const publishedOrder = params.order ?? 'published_at desc';
    const sections: Partial<Record<PostsSectionKey, PostsSectionQuery>> = {};

    if (params.type === 'featured') {
        // A single query across all statuses
        sections.published = {filter: withRest(`status:${statusUnion}`), order: publishedOrder};
        return {sections, allFilter: withRest(`status:${statusUnion}`)};
    }

    if (params.type === null || params.type === 'scheduled') {
        sections.scheduled = {filter: withRest('status:scheduled'), order: publishedOrder};
    }
    if (params.type === null || params.type === 'draft') {
        sections.drafts = {filter: withRest('status:draft'), order: params.order ?? 'updated_at desc'};
    }

    let publishedStatus: string | null = null;
    if (params.type === null) {
        publishedStatus = resource === 'pages' ? 'published' : '[published,sent]';
    } else if (params.type === 'published') {
        publishedStatus = 'published';
    } else if (params.type === 'sent') {
        publishedStatus = 'sent';
    }
    if (publishedStatus) {
        sections.published = {filter: withRest(`status:${publishedStatus}`), order: publishedOrder};
    }

    const allStatus = params.type === null ? statusUnion : (publishedStatus ?? params.type);

    return {sections, allFilter: withRest(`status:${allStatus}`)};
}
