import {Meta, createQuery} from '../utils/apiRequests';

export type Post = {
    id: string;
    url: string;
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
