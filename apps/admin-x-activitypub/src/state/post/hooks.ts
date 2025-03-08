import {Activity} from '@tryghost/admin-x-framework/api/activitypub';
import {useInfiniteQuery, useMutation, useQuery} from '@tanstack/react-query';

import {Post, PostType} from '../../api/activitypub';
import {createActivityPubAPI, getSiteUrl} from '../util/api';
import {mapActivityToPost} from '../../utils/posts';
import {usePostStore} from './store';

const getInboxPostsCollectionKey = () => 'inbox';
const getFeedPostsCollectionKey = () => 'feed';
const getThreadPostsCollectionKey = (postId: string) => `thread:${postId}`;

export function useInbox({
    handle,
    disableQuery = false
}: {
    handle: string,
    disableQuery?: boolean
}) {
    const postStore = usePostStore();
    const collectionKey = getInboxPostsCollectionKey();
    const queryKey = ['inbox'];

    const inboxQuery = useInfiniteQuery({
        queryKey,
        enabled: !disableQuery,
        async queryFn({pageParam}: {pageParam?: string}) {
            const siteUrl = await getSiteUrl();
            const api = createActivityPubAPI(handle, siteUrl);

            return api.getInbox(pageParam)
                .then((response) => {
                    response.posts.forEach((post) => {
                        postStore.add(post);

                        postStore.addToCollection(collectionKey, post.id);
                    });

                    return {
                        next: response.next
                    };
                });
        },
        getNextPageParam(prevPage) {
            return prevPage.next;
        }
    });

    return {
        posts: postStore.getCollection(collectionKey),
        hasMore: inboxQuery.hasNextPage,
        fetchMore: inboxQuery.fetchNextPage,
        isFetchingMore: inboxQuery.isFetchingNextPage,
        isLoading: inboxQuery.isLoading
    };
}

export function useFeed({
    handle,
    disableQuery = false
}: {
    handle: string,
    disableQuery?: boolean
}) {
    const postStore = usePostStore();
    const collectionKey = 'feed';
    const queryKey = ['feed'];

    const feedQuery = useInfiniteQuery({
        queryKey,
        enabled: !disableQuery,
        async queryFn({pageParam}: {pageParam?: string}) {
            const siteUrl = await getSiteUrl();
            const api = createActivityPubAPI(handle, siteUrl);

            return api.getFeed(pageParam)
                .then((response) => {
                    response.posts.forEach((post) => {
                        postStore.add(post);

                        postStore.addToCollection(collectionKey, post.id);
                    });

                    return {
                        next: response.next
                    };
                });
        },
        getNextPageParam(prevPage) {
            return prevPage.next;
        }
    });

    return {
        posts: postStore.getCollection(collectionKey),
        hasMore: feedQuery.hasNextPage,
        fetchMore: feedQuery.fetchNextPage,
        isFetchingMore: feedQuery.isFetchingNextPage,
        isLoading: feedQuery.isLoading
    };
}

export function useThread({
    handle,
    postId
}: {
    handle: string,
    postId: string
}) {
    const postStore = usePostStore();
    const collectionKey = getThreadPostsCollectionKey(postId);
    const queryKey = ['thread', postId];

    const threadQuery = useQuery({
        queryKey,
        async queryFn() {
            const siteUrl = await getSiteUrl();
            const api = createActivityPubAPI(handle, siteUrl);

            return api.getThread(postId).then((response) => {
                response.posts.forEach((post) => {
                    postStore.add(post);

                    postStore.addToCollection(collectionKey, post.id);
                });

                return true;
            });
        }
    });

    return {
        posts: postStore.getCollection(collectionKey),
        isLoading: threadQuery.isLoading
    };
}

export function useCreate({handle}: {handle: string}) {
    const postStore = usePostStore();

    const mutation = useMutation({
        async mutationFn(content: string) {
            const siteUrl = await getSiteUrl();
            const api = createActivityPubAPI(handle, siteUrl);

            return api.note(content);
        },
        onSuccess: (activity: Activity) => {
            postStore.add(mapActivityToPost(activity));

            postStore.addToCollection(getFeedPostsCollectionKey(), activity.id, 'start');
        }
    });

    return {
        create: mutation.mutate,
        isCreating: mutation.isLoading
    };
}

export function useLike({handle}: {handle: string}) {
    const postStore = usePostStore();

    const likeMutation = useMutation({
        async mutationFn(postId: string) {
            const siteUrl = await getSiteUrl();
            const api = createActivityPubAPI(handle, siteUrl);

            return api.like(postId);
        },
        onMutate: (postId) => {
            postStore.updateById(postId, (post: Post) => ({
                ...post,
                likedByMe: true
            }));

            return {
                postId
            };
        },
        onError(error, _variables, context) {
            // eslint-disable-next-line no-console
            console.error(error);

            if (context) {
                postStore.updateById(context.postId, (post: Post) => ({
                    ...post,
                    likedByMe: false
                }));
            }
        }
    });

    const unlikeMutation = useMutation({
        async mutationFn(postId: string) {
            const siteUrl = await getSiteUrl();
            const api = createActivityPubAPI(handle, siteUrl);

            return api.unlike(postId);
        },
        onMutate: (postId) => {
            postStore.updateById(postId, (post: Post) => ({
                ...post,
                likedByMe: false
            }));

            return {
                postId
            };
        },
        onError(error, _variables, context) {
            // eslint-disable-next-line no-console
            console.error(error);

            if (context) {
                postStore.updateById(context.postId, (post: Post) => ({
                    ...post,
                    likedByMe: true
                }));
            }
        }
    });

    return {
        like: likeMutation.mutate,
        unlike: unlikeMutation.mutate
    };
}

export function useReply({handle}: {handle: string}) {
    const postStore = usePostStore();

    const mutation = useMutation({
        async mutationFn({inReplyTo, content}: {inReplyTo: string, content: string}) {
            const siteUrl = await getSiteUrl();
            const api = createActivityPubAPI(handle, siteUrl);

            return api.reply(inReplyTo, content).then((activity: Activity) => {
                activity.object.authored = true;
                activity.id = activity.object.id;

                return activity;
            });
        },
        onSuccess: (activity: Activity, {inReplyTo}: {inReplyTo: string}) => {
            postStore.add(mapActivityToPost(activity));

            postStore.addToCollection(getThreadPostsCollectionKey(inReplyTo), activity.id);

            postStore.updateById(inReplyTo, (post: Post) => ({
                ...post,
                replyCount: (post.replyCount ?? 0) + 1
            }));
        }
    });

    return {
        reply: mutation.mutate,
        isReplying: mutation.isLoading
    };
}

export function useDelete({handle}: {handle: string}) {
    const postStore = usePostStore();
    const inboxCollectionKey = getInboxPostsCollectionKey();
    const feedCollectionKey = getFeedPostsCollectionKey();
    let threadCollectionKey: string | null = null;

    const mutation = useMutation({
        async mutationFn(mutationData: {id: string, parent?: string}) {
            const siteUrl = await getSiteUrl();
            const api = createActivityPubAPI(handle, siteUrl);

            return api.delete(mutationData.id);
        },
        onMutate: ({id, parent}) => {
            const post = postStore.getById(id);

            if (!post) {
                return;
            }

            postStore.updateById(id, () => ({
                ...post,
                type: PostType.Tombstone
            }));

            const positions = {
                inbox: postStore.getPositionInCollection(inboxCollectionKey, id),
                feed: postStore.getPositionInCollection(feedCollectionKey, id),
                thread: threadCollectionKey ? postStore.getPositionInCollection(threadCollectionKey, id) : -1
            };

            postStore.removeFromCollection(inboxCollectionKey, id);
            postStore.removeFromCollection(feedCollectionKey, id);

            if (parent) {
                postStore.updateById(parent, (parentPost: Post) => ({
                    ...parentPost,
                    replyCount: (parentPost.replyCount ?? 0) - 1
                }));

                threadCollectionKey = getThreadPostsCollectionKey(parent);

                postStore.removeFromCollection(threadCollectionKey, id);
            }

            return {
                id,
                parent,
                type: post.type,
                positions
            };
        },
        onError: (error, _variables, context) => {
            // eslint-disable-next-line no-console
            console.error(error);

            if (context) {
                postStore.updateById(context.id, (post: Post) => ({
                    ...post,
                    type: context.type
                }));

                if (context.positions.inbox !== -1) {
                    postStore.addToCollection(inboxCollectionKey, context.id, context.positions.inbox);
                }

                if (context.positions.feed !== -1) {
                    postStore.addToCollection(feedCollectionKey, context.id, context.positions.feed);
                }

                if (context.parent) {
                    postStore.updateById(context.parent, (parentPost: Post) => ({
                        ...parentPost,
                        replyCount: (parentPost.replyCount ?? 0) + 1
                    }));

                    if (threadCollectionKey) {
                        postStore.addToCollection(threadCollectionKey, context.id, context.positions.thread);
                    }
                }
            }
        }
    });

    return {
        delete: mutation.mutate
    };
}
