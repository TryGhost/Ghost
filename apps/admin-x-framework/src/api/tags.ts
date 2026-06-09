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
    count?: {
        posts: number;
    };

    // Field names match the snake_case casing of the Admin API response
    feature_image: string | null;
    accent_color: string | null;
    meta_title: string | null;
    meta_description: string | null;
    canonical_url: string | null;
    twitter_image: string | null;
    twitter_title: string | null;
    twitter_description: string | null;
    og_image: string | null;
    og_title: string | null;
    og_description: string | null;
    codeinjection_head: string | null;
    codeinjection_foot: string | null;
    created_at: string;
    updated_at: string;
};

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

export const getTagBySlug = createQueryWithId<TagsResponseType>({
    dataType,
    path: slug => `/tags/slug/${slug}/`,
    defaultSearchParams: {include: 'count.posts'}
});

export const useAddTag = createMutation<TagsResponseType, Partial<Tag>>({
    method: 'POST',
    path: () => '/tags/',
    body: tag => ({tags: [tag]}),
    defaultSearchParams: {include: 'count.posts'},
    invalidateQueries: {dataType}
});

export const useEditTag = createMutation<TagsResponseType, Partial<Tag> & {id: string}>({
    method: 'PUT',
    path: tag => `/tags/${tag.id}/`,
    body: tag => ({tags: [tag]}),
    defaultSearchParams: {include: 'count.posts'},
    invalidateQueries: {dataType}
});

export const useDeleteTag = createMutation<unknown, string>({
    method: 'DELETE',
    path: id => `/tags/${id}/`,
    invalidateQueries: {dataType}
});
