import {Meta, createQuery} from '../apiRequests';
import {Post} from '../../types/api';

export interface PostsResponseType {
    meta?: Meta
    posts: Post[];
}

const dataType = 'PostsResponseType';

export const useBrowsePosts = createQuery<PostsResponseType>({
    dataType,
    path: '/posts/'
});
