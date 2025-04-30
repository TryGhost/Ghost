import {Meta, createQuery} from '../utils/api/hooks';

// Types

export type TopPerformingPostsItem = {
    id: string;
    title: string;
    free_members: Number;
    paid_members: Number;
    mrr: Number;
}

export type TopPerformingPostsResponseType = {
    stats: TopPerformingPostsItem[];
    meta: Meta;
}

// Requests

const dataType = 'TopPerformingPostsResponseType';

export const useTopPerformingPosts = createQuery<TopPerformingPostsResponseType>({
    dataType,
    path: '/stats/posts/top'
});
