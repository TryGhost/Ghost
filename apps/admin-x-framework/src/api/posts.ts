import {Meta, createQuery, createQueryWithId, createMutation} from '../utils/api/hooks';

export type Email = {
    opened_count: number;
    email_count: number;
    status?: string;
};

export type Post = {
    id: string;
    url: string;
    slug: string;
    title: string;
    uuid: string;
    feature_image?: string;
    count?: {
        clicks?: number;
        positive_feedback?: number;
        negative_feedback?: number;
    };
    email?: Email;
    status?: string;
    published_at?: string;
    newsletter_id?: string;
    newsletter?: object;
    email_only?: boolean;
    email_segment?: string;
    email_recipient_filter?: string;
    send_email_when_published?: boolean;
    email_stats?: object;
};

export interface PostsResponseType {
    meta?: Meta
    posts: Post[];
}

const dataType = 'PostsResponseType';

export const useBrowsePosts = createQuery<PostsResponseType>({
    dataType,
    path: '/posts/'
});

export const getPost = createQueryWithId<PostsResponseType>({
    dataType,
    path: id => `/posts/${id}/`
});

// This endpoints returns a csv file
export const usePostsExports = createQuery<string>({
    dataType,
    path: '/posts/export/'
});

export const useDeletePost = createMutation<unknown, string>({
    method: 'DELETE',
    path: id => `/posts/${id}/`
});
