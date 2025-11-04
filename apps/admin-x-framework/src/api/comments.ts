import {InfiniteData} from '@tanstack/react-query';
import {
    Meta,
    createInfiniteQuery
} from '../utils/api/hooks';

export type Comment = {
    id: string;
    html: string;
    status: 'published' | 'hidden' | 'deleted';
    created_at: string;
    updated_at: string;
    post_id: string;
    member_id: string;
    parent_id: string | null;
    member?: {
        id: string;
        name: string;
        email: string;
        avatar_image?: string;
    };
    post?: {
        id: string;
        title: string;
        slug: string;
    };
    count?: {
        replies?: number;
        likes?: number;
    };
};

export interface CommentsResponseType {
    meta?: Meta;
    comments: Comment[];
}

const dataType = 'CommentsResponseType';

const useBrowseCommentsQuery = createInfiniteQuery<CommentsResponseType>({
    dataType,
    path: '/comments/',
    defaultNextPageParams: (lastPage, otherParams) => (lastPage.meta?.pagination.next
        ? {
            ...otherParams,
            page: (lastPage.meta?.pagination.next || 1).toString()
        }
        : undefined),
    returnData: (originalData) => {
        const {pages} = originalData as InfiniteData<CommentsResponseType>;
        const comments = pages.flatMap(page => page.comments);
        const meta = pages[pages.length - 1].meta;

        return {
            comments,
            meta,
            isEnd: meta ? meta.pagination.pages === meta.pagination.page : true
        };
    }
});

export const useBrowseComments = (args?: Parameters<typeof useBrowseCommentsQuery>[0]) => {
    return useBrowseCommentsQuery({
        ...args,
        searchParams: {
            limit: '100',
            order: 'created_at desc',
            include: 'member,post',
            ...args?.searchParams
        }
    });
};
