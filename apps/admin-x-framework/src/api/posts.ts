import {Meta, createQuery, createQueryWithId} from '../utils/api/hooks';

export type Email = {
    opened_count: number;
    email_count: number;
}

export type Post = {
    id: string;
    url: string;
    slug: string;
    title: string;
    uuid: string;
    count?: {
        clicks?: number;
    };
    email?: Email;
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
