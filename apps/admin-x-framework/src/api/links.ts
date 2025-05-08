import {Meta, createQuery, createMutation} from '../utils/api/hooks';

export type LinkResponseType = {
    links: LinkItem[];
    meta: Meta;
}

export type LinkItem = {
    post_id: string;
    link: {
        link_id: string;
        from: string;
        to: string;
        edited: boolean;
    },
    count: {
        clicks: number;
    }
}

export type BulkEditLinksResponseType = {
    bulk: {
        action: string;
        meta: {
            stats: {
                successful: number;
                unsuccessful: number;
            }
            errors: []
            unsuccessfulData: []
        }
    }
}

export type useBulkEditLinksParameters = {
    postId: string;
    originalUrl: string;
    editedUrl: string;
}

export const useTopLinks = createQuery<LinkResponseType>({
    dataType: 'LinkResponseType',
    path: '/links/'
});

export const useBulkEditLinks = createMutation<BulkEditLinksResponseType, useBulkEditLinksParameters>({
    method: 'PUT',
    path: () => '/links/bulk/',
    body: ({editedUrl}) => ({
        bulk: {
            action: 'updateLink',
            meta: {
                link: {
                    to: editedUrl
                }
            }
        }
    }),
    searchParams: ({originalUrl, postId}) => ({
        filter: `post_id:'${postId}'+to:'${originalUrl}'`
    })
});