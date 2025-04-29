import {Meta, createQuery} from '../utils/api/hooks';

export type Post = {
    id: string;
    url: string;
    slug: string;
    title: string;
    uuid: string;
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

// This endpoints returns a csv file
export const usePostsExports = createQuery<string>({
    dataType,
    path: '/posts/export/'
});
