import {
    Meta,
    createQuery,
    createQueryWithId,
    createMutation
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

const useBrowseTagsQuery = createQuery<TagsResponseType>({
    dataType,
    path: '/tags/'
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
