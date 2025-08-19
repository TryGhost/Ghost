import {Meta, createQuery, createQueryWithId, createMutation} from '../utils/api/hooks';

export type Tag = {
    id: string;
    name: string;
    slug: string;
    url: string;
    description: string;
    metaTitle: string;
    metaDescription: string;
    twitterImage: string;
    twitterTitle: string;
    twitterDescription: string;
    ogImage: string;
    ogTitle: string;
    ogDescription: string;
    codeinjectionHead: string;
    codeinjectionFoot: string;
    canonicalUrl: string;
    accentColor: string;
    featureImage: string;
    visibility: 'public' | 'internal';
    createdAtUTC: string;
    updatedAtUTC: string;
    count: number;
};

export interface TagsResponseType {
    meta?: Meta
    tags: Tag[];
}

const dataType = 'TagsResponseType';

export const useBrowseTags = createQuery<TagsResponseType>({
    dataType,
    path: '/tags/',
    defaultSearchParams: {
        type: 'public'
    }
});

export const getTag = createQueryWithId<TagsResponseType>({
    dataType,
    path: id => `/tags/${id}/`
});

export const useDeleteTag = createMutation<unknown, string>({
    method: 'DELETE',
    path: id => `/tags/${id}/`
});
