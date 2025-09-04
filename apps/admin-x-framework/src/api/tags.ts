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
    description: string;
    visibility: 'public' | 'internal';
    count?: {
        posts: number;
    };

    // XXX: Ensure the types match the casing in the API response by either
    // transforming them to camelCase or using snake_case
    // metaTitle: string;
    // metaDescription: string;
    // twitterImage: string;
    // twitterTitle: string;
    // twitterDescription: string;
    // ogImage: string;
    // ogTitle: string;
    // ogDescription: string;
    // codeinjectionHead: string;
    // codeinjectionFoot: string;
    // canonicalUrl: string;
    // accentColor: string;
    // featureImage: string;
    // createdAtUTC: string;
    // updatedAtUTC: string;
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

export const useDeleteTag = createMutation<unknown, string>({
    method: 'DELETE',
    path: id => `/tags/${id}/`
});
