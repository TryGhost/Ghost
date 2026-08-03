import {Meta, createQuery, createMutation} from '../utils/api/hooks';
import {escapeNqlString} from '@tryghost/nql-string';

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
        // URLs may legally contain single quotes (e.g. a trailing `'` typo),
        // which would otherwise terminate the NQL string literal and make the
        // whole filter unparseable - silently breaking the edit
        filter: `post_id:${escapeNqlString(postId)}+to:${escapeNqlString(originalUrl)}`
    })
});
