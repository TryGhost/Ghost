import {InfiniteData} from '@tanstack/react-query';
import {
    Meta,
    createQueryWithId,
    createMutation,
    createInfiniteQuery
} from '../utils/api/hooks';

export type Tag = {
    id: string;
    name: string;
    slug: string;
    url: string;
    description: string | null;
    visibility: 'public' | 'internal';
    feature_image: string | null;
    meta_title: string | null;
    meta_description: string | null;
    twitter_image: string | null;
    twitter_title: string | null;
    twitter_description: string | null;
    og_image: string | null;
    og_title: string | null;
    og_description: string | null;
    codeinjection_head: string | null;
    codeinjection_foot: string | null;
    canonical_url: string | null;
    accent_color: string | null;
    created_at?: string;
    updated_at?: string | null;
    count?: {
        posts: number;
    };
};

export type TagEditableData = Partial<Omit<Tag, 'id' | 'url' | 'count' | 'created_at' | 'updated_at'>>;

export interface TagsResponseType {
    meta?: Meta;
    tags: Tag[];
}

const dataType = 'TagsResponseType';

const useBrowseTagsQuery = createInfiniteQuery<TagsResponseType>({
    dataType,
    path: '/tags/',
    defaultNextPageParams: (lastPage, otherParams) => (lastPage.meta?.pagination.next
        ? {
            ...otherParams,
            page: (lastPage.meta?.pagination.next || 1).toString()
        }
        : undefined),
    returnData: (originalData) => {
        const {pages} = originalData as InfiniteData<TagsResponseType>;
        const tags = pages.flatMap(page => page.tags);
        const meta = pages[pages.length - 1].meta;

        return {
            tags,
            meta,
            isEnd: meta ? meta.pagination.pages === meta.pagination.page : true
        };
    }
});

export const useBrowseTags = ({
    filter,
    ...args
}: { filter: Record<string, string | number | boolean> } & Parameters<
    typeof useBrowseTagsQuery
>[0]) => {
    const filterString = Object.entries(filter)
        .map(([key, value]) => `${key}:${value}`)
        .join(',');
    return useBrowseTagsQuery({
        ...args,
        searchParams: {
            limit: '100',
            order: 'name asc',
            include: 'count.posts',
            filter: filterString,
            ...args.searchParams
        }
    });
};

export const getTag = createQueryWithId<TagsResponseType>({
    dataType,
    path: id => `/tags/${id}/`
});

// Mirrors Ember's `queryRecord('tag', {slug})`, which the admin API serves at
// the dedicated `/tags/slug/:slug/` route.
export const getTagBySlug = createQueryWithId<TagsResponseType>({
    dataType,
    path: slug => `/tags/slug/${slug}/`
});

export const useAddTag = createMutation<TagsResponseType, TagEditableData>({
    method: 'POST',
    path: () => '/tags/',
    searchParams: () => ({include: 'count.posts'}),
    body: tag => ({tags: [tag]}),
    invalidateQueries: {dataType}
});

export const useEditTag = createMutation<TagsResponseType, TagEditableData & {id: string}>({
    method: 'PUT',
    path: ({id}) => `/tags/${id}/`,
    searchParams: () => ({include: 'count.posts'}),
    body: ({id, ...rest}) => ({tags: [{id, ...rest}]}),
    invalidateQueries: {dataType}
});

export const useDeleteTag = createMutation<unknown, string>({
    method: 'DELETE',
    path: id => `/tags/${id}/`,
    invalidateQueries: {dataType}
});
