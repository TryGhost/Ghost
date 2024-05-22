import {createMutation, createQueryWithId} from '../utils/api/hooks';

type FollowData = {
    username: string
};

type Inbox = {
    '@context': string;
    id: string;
    summary: string;
    type: string;
    totalItems: number;
    orderedItems: object[] | [];
}

type InboxResponseData = {
    inbox: Inbox;
}

type Following = {
    '@context': string;
    id: string;
    summary: string;
    type: string;
    totalItems: number;
    items: {
        username: string;
    }[] | [];
}

type FollowingResponseData = {
    following: Following;
}

export const useFollow = createMutation<object, FollowData>({
    method: 'POST',
    path: data => `/activitypub/follow/${data.username}`
});

const dataType = 'InboxResponseData';

// This is a frontend root, not using the Ghost admin API
export const useBrowseInboxForUser = createQueryWithId<InboxResponseData>({
    dataType,
    useActivityPub: true,
    path: id => `/inbox/${id}`
});

export const useBrowseFollowingForUser = createQueryWithId<FollowingResponseData>({
    dataType,
    useActivityPub: true,
    path: id => `/following/${id}`
});
