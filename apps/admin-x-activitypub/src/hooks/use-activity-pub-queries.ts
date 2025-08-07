import {
    type Account,
    type AccountFollowsType,
    type AccountSearchResult,
    ActivityPubAPI,
    ActivityPubCollectionResponse,
    type GetAccountFollowsResponse,
    type Notification,
    type Post,
    type ReplyChainResponse,
    type SearchResults,
    isApiError
} from '../api/activitypub';
import {Activity, ActorProperties} from '@tryghost/admin-x-framework/api/activitypub';
import {
    type QueryClient,
    type UseInfiniteQueryResult,
    useInfiniteQuery,
    useMutation,
    useQuery,
    useQueryClient
} from '@tanstack/react-query';
import {formatPendingActivityContent, generatePendingActivity, generatePendingActivityId} from '../utils/pending-activity';
import {mapPostToActivity} from '../utils/posts';
import {toast} from 'sonner';
import {useCallback, useEffect, useMemo, useState} from 'react';

export type ActivityPubCollectionQueryResult<TData> = UseInfiniteQueryResult<ActivityPubCollectionResponse<TData>>;
export type AccountFollowsQueryResult = UseInfiniteQueryResult<GetAccountFollowsResponse>;

let SITE_URL: string;

async function getSiteUrl() {
    if (!SITE_URL) {
        const response = await fetch('/ghost/api/admin/site');
        const json = await response.json();
        SITE_URL = json.site.url;
    }

    return SITE_URL;
}

function createActivityPubAPI(handle: string, siteUrl: string) {
    return new ActivityPubAPI(
        new URL(siteUrl),
        new URL('/ghost/api/admin/identities/', window.location.origin),
        handle
    );
}

function renderRateLimitError(
    title = 'Rate limit exceeded',
    description = 'You\'ve made too many requests. Please try again later.'
) {
    toast.error(title, {description});
}

function renderBlockedError(
    title = 'Action failed',
    description = 'This user has restricted who can interact with their account.'
) {
    toast.error(title, {description});
}

const QUERY_KEYS = {
    outbox: (handle: string) => ['outbox', handle],
    liked: (handle: string) => ['liked', handle],
    user: (handle: string) => ['user', handle],
    profilePosts: (profileHandle: string | null) => {
        if (profileHandle === null) {
            return ['profile_posts'];
        }
        return ['profile_posts', profileHandle];
    },
    account: (handle: string) => ['account', handle],
    accountFollows: (handle: string, type: AccountFollowsType) => ['account_follows', handle, type],
    searchResults: (query: string) => ['search_results', query],
    suggestedProfiles: (handle: string, limit: number) => ['suggested_profiles', handle, limit],
    exploreProfiles: (handle: string) => ['explore_profiles', handle],
    replyChain: (id: string | null) => {
        if (id === null) {
            return ['reply_chain'];
        }
        return ['reply_chain', id];
    },
    feed: ['feed'],
    inbox: ['inbox'],
    postsByAccount: ['account_posts'],
    postsLikedByAccount: ['account_liked_posts'],
    notifications: (handle: string) => ['notifications', handle],
    notificationsCount: (handle: string) => ['notifications_count', handle],
    blockedAccounts: (handle: string) => ['blocked_accounts', handle],
    blockedDomains: (handle: string) => ['blocked_domains', handle]
};

function updateLikeCache(queryClient: QueryClient, handle: string, id: string, liked: boolean) {
    const queryKeys = [
        QUERY_KEYS.feed,
        QUERY_KEYS.inbox,
        QUERY_KEYS.postsLikedByAccount,
        QUERY_KEYS.profilePosts('index')
    ];

    // Add handle-specific profile posts if different from index
    if (handle !== 'index') {
        queryKeys.push(QUERY_KEYS.profilePosts(handle));
    }

    for (const queryKey of queryKeys) {
        // Handle paginated caches (feed, inbox, etc.)
        queryClient.setQueriesData(queryKey, (current?: {pages: {posts: Activity[]}[]}) => {
            if (current === undefined) {
                return current;
            }

            return {
                ...current,
                pages: current.pages.map((page: {posts: Activity[]}) => {
                    return {
                        ...page,
                        posts: page.posts.map((item: Activity) => {
                            if (item.object.id === id) {
                                return {
                                    ...item,
                                    object: {
                                        ...item.object,
                                        liked: liked,
                                        likeCount: Math.max(liked ? (item.object.likeCount || 0) + 1 : (item.object.likeCount || 0) - 1, 0)
                                    }
                                };
                            }

                            return item;
                        })
                    };
                })
            };
        });

        // For the likes tab, add/remove the post
        if (queryKey === QUERY_KEYS.postsLikedByAccount) {
            queryClient.setQueriesData(queryKey, (current?: {pages: {posts: Activity[]}[]}) => {
                if (!current) {
                    return current;
                }

                return {
                    ...current,
                    pages: current.pages.map((page: {posts: Activity[]}) => {
                        return {
                            ...page,
                            posts: liked
                                // If liking, keep the post (it will be added via refetch)
                                ? page.posts
                                // If unliking, remove the post
                                : page.posts.filter(item => item.object.id !== id)
                        };
                    })
                };
            });

            // Invalidate the likes tab query to refetch and get the new post when liking
            if (liked) {
                queryClient.invalidateQueries({queryKey: QUERY_KEYS.postsLikedByAccount});
            }
        }
    }
}

function updateFollowCache(queryClient: QueryClient, handle: string, authorHandle: string, followedByMe: boolean) {
    const queryKeys = [
        QUERY_KEYS.feed,
        QUERY_KEYS.inbox,
        QUERY_KEYS.profilePosts('index')
    ];

    // Add handle-specific profile posts if different from index
    if (handle !== 'index') {
        queryKeys.push(QUERY_KEYS.profilePosts(handle));
    }

    const preferredUsername = authorHandle.split('@')[1];

    for (const queryKey of queryKeys) {
        queryClient.setQueriesData(queryKey, (current?: {pages: {posts: Activity[]}[]}) => {
            if (current === undefined) {
                return current;
            }

            return {
                ...current,
                pages: current.pages.map((page: {posts: Activity[]}) => {
                    return {
                        ...page,
                        posts: page.posts.map((item: Activity) => {
                            // Update regular posts by this author
                            if (item.type !== 'Announce' && item.actor?.preferredUsername === preferredUsername) {
                                return {
                                    ...item,
                                    actor: {
                                        ...item.actor,
                                        followedByMe: followedByMe
                                    }
                                };
                            }

                            // Update reposts where the original author is being followed/unfollowed
                            if (item.type === 'Announce' &&
                                typeof item.object.attributedTo === 'object' &&
                                item.object.attributedTo &&
                                !Array.isArray(item.object.attributedTo) &&
                                'preferredUsername' in item.object.attributedTo &&
                                item.object.attributedTo.preferredUsername === preferredUsername) {
                                return {
                                    ...item,
                                    object: {
                                        ...item.object,
                                        attributedTo: {
                                            ...item.object.attributedTo,
                                            followedByMe: followedByMe
                                        }
                                    }
                                };
                            }

                            return item;
                        })
                    };
                })
            };
        });
    }

    // Handle reply chain cache (used by Note.tsx and Reader.tsx)
    const replyChainQueryKey = QUERY_KEYS.replyChain(null);
    queryClient.setQueriesData(replyChainQueryKey, (current?: ReplyChainResponse) => {
        if (!current) {
            return current;
        }

        const updatePost = (post: Post) => {
            if (post.author.handle === authorHandle) {
                return {
                    ...post,
                    author: {
                        ...post.author,
                        followedByMe: followedByMe
                    }
                };
            }
            return post;
        };

        return {
            ...current,
            post: updatePost(current.post),
            ancestors: {
                ...current.ancestors,
                chain: current.ancestors.chain.map(updatePost)
            },
            children: current.children.map(child => ({
                ...child,
                post: updatePost(child.post),
                chain: child.chain.map(updatePost)
            }))
        };
    });
}

// Update non-paginated caches (should only be called once per mutation)
function updateLikeCacheOnce(queryClient: QueryClient, id: string, liked: boolean) {
    // Handle reply chain cache (used by Note.tsx and Reader.tsx)
    const replyChainQueryKey = QUERY_KEYS.replyChain(null);
    queryClient.setQueriesData(replyChainQueryKey, (current?: ReplyChainResponse) => {
        if (!current) {
            return current;
        }

        const updatePost = (post: Post) => {
            if (post.id === id) {
                return {
                    ...post,
                    likedByMe: liked,
                    likeCount: Math.max(liked ? (post.likeCount || 0) + 1 : (post.likeCount || 0) - 1, 0)
                };
            }
            return post;
        };

        return {
            ...current,
            post: updatePost(current.post),
            ancestors: {
                ...current.ancestors,
                chain: current.ancestors.chain.map(updatePost)
            },
            children: current.children.map(child => ({
                ...child,
                post: updatePost(child.post),
                chain: child.chain.map(updatePost)
            }))
        };
    });

    // Handle account liked count
    queryClient.setQueryData(QUERY_KEYS.account('index'), (currentAccount?: Account) => {
        if (!currentAccount) {
            return currentAccount;
        }
        return {
            ...currentAccount,
            likedCount: Math.max(0, currentAccount.likedCount + (liked ? 1 : -1))
        };
    });
}

function updateNotificationsLikedCache(queryClient: QueryClient, handle: string, id: string, liked: boolean) {
    const notificationQueryKey = QUERY_KEYS.notifications(handle);
    queryClient.setQueriesData(
        {queryKey: notificationQueryKey},
        (current?: {pages?: {notifications?: Notification[]}[]}) => {
            if (!current || !current.pages) {
                return current;
            }

            try {
                return {
                    ...current,
                    pages: current.pages.map((page) => {
                        if (!page || !page.notifications) {
                            return page;
                        }

                        return {
                            ...page,
                            notifications: page.notifications.map((notification) => {
                                if (!notification || !notification.post) {
                                    return notification;
                                }

                                if (notification.post.id === id) {
                                    return {
                                        ...notification,
                                        post: {
                                            ...notification.post,
                                            likedByMe: liked,
                                            likeCount: Math.max(liked ? notification.post.likeCount + 1 : notification.post.likeCount - 1, 0)
                                        }
                                    };
                                }
                                return notification;
                            })
                        };
                    })
                };
            } catch (error) {
                return current;
            }
        }
    );
}

function updateNotificationsRepostCache(queryClient: QueryClient, handle: string, id: string, reposted: boolean) {
    const notificationQueryKey = QUERY_KEYS.notifications(handle);
    queryClient.setQueriesData(
        {queryKey: notificationQueryKey},
        (current?: {pages?: {notifications?: Notification[]}[]}) => {
            if (!current || !current.pages) {
                return current;
            }

            try {
                return {
                    ...current,
                    pages: current.pages.map((page) => {
                        if (!page || !page.notifications) {
                            return page;
                        }

                        return {
                            ...page,
                            notifications: page.notifications.map((notification) => {
                                if (!notification || !notification.post) {
                                    return notification;
                                }

                                if (notification.post.id === id) {
                                    return {
                                        ...notification,
                                        post: {
                                            ...notification.post,
                                            repostedByMe: reposted,
                                            repostCount: Math.max(reposted ? notification.post.repostCount + 1 : notification.post.repostCount - 1, 0)
                                        }
                                    };
                                }
                                return notification;
                            })
                        };
                    })
                };
            } catch (error) {
                return current;
            }
        }
    );
}

function updateNotificationsReplyCountCache(queryClient: QueryClient, handle: string, id: string, delta: number) {
    const notificationQueryKey = QUERY_KEYS.notifications(handle);
    queryClient.setQueriesData(
        {queryKey: notificationQueryKey},
        (current?: {pages?: {notifications?: Notification[]}[]}) => {
            if (!current || !current.pages) {
                return current;
            }

            try {
                return {
                    ...current,
                    pages: current.pages.map((page) => {
                        if (!page || !page.notifications) {
                            return page;
                        }

                        return {
                            ...page,
                            notifications: page.notifications.map((notification) => {
                                if (!notification || !notification.post) {
                                    return notification;
                                }

                                if (notification.post.id === id) {
                                    return {
                                        ...notification,
                                        post: {
                                            ...notification.post,
                                            replyCount: Math.max((notification.post.replyCount ?? 0) + delta, 0)
                                        }
                                    };
                                }
                                return notification;
                            })
                        };
                    })
                };
            } catch (error) {
                return current;
            }
        }
    );
}

function updateReplyCache(queryClient: QueryClient, id: string, delta: number) {
    const queryKeys = [
        QUERY_KEYS.feed,
        QUERY_KEYS.inbox,
        QUERY_KEYS.profilePosts('index'),
        QUERY_KEYS.postsLikedByAccount
    ];

    for (const queryKey of queryKeys) {
        queryClient.setQueriesData(queryKey, (current?: {pages: {posts: Activity[]}[]}) => {
            if (!current) {
                return current;
            }

            return {
                ...current,
                pages: current.pages.map(page => ({
                    ...page,
                    posts: page.posts.map((activity) => {
                        if (activity.object.id === id) {
                            return {
                                ...activity,
                                object: {
                                    ...activity.object,
                                    replyCount: Math.max((activity.object.replyCount ?? 0) + delta, 0)
                                }
                            };
                        }
                        return activity;
                    })
                }))
            };
        });
    }
}

function updateReplyCacheOnce(queryClient: QueryClient, id: string, delta: number) {
    // Update reply chain cache (used by Note.tsx and Reader.tsx)
    const replyChainQueryKey = QUERY_KEYS.replyChain(null);
    queryClient.setQueriesData(replyChainQueryKey, (current?: ReplyChainResponse) => {
        if (!current) {
            return current;
        }

        const updatePost = (post: Post) => {
            if (post.id === id) {
                return {
                    ...post,
                    replyCount: Math.max((post.replyCount || 0) + delta, 0)
                };
            }
            return post;
        };

        return {
            ...current,
            post: updatePost(current.post),
            ancestors: {
                ...current.ancestors,
                chain: current.ancestors.chain.map(updatePost)
            },
            children: current.children.map(child => ({
                ...child,
                post: updatePost(child.post),
                chain: child.chain.map(updatePost)
            }))
        };
    });
}

export function useBlockedAccountsForUser(handle: string) {
    return useInfiniteQuery({
        queryKey: QUERY_KEYS.blockedAccounts(handle),
        refetchOnMount: 'always',
        async queryFn({pageParam}: {pageParam?: string}) {
            const siteUrl = await getSiteUrl();
            const api = createActivityPubAPI(handle, siteUrl);

            return api.getBlockedAccounts(pageParam);
        },
        getNextPageParam(prevPage) {
            return prevPage.next;
        }
    });
}

export function useBlockedDomainsForUser(handle: string) {
    return useInfiniteQuery({
        queryKey: QUERY_KEYS.blockedDomains(handle),
        refetchOnMount: 'always',
        async queryFn({pageParam}: {pageParam?: string}) {
            const siteUrl = await getSiteUrl();
            const api = createActivityPubAPI(handle, siteUrl);

            return api.getBlockedDomains(pageParam);
        },
        getNextPageParam(prevPage) {
            return prevPage.next;
        }
    });
}

export function useLikeMutationForUser(handle: string) {
    const queryClient = useQueryClient();

    return useMutation({
        async mutationFn(id: string) {
            const siteUrl = await getSiteUrl();
            const api = createActivityPubAPI(handle, siteUrl);

            return api.like(id);
        },
        onMutate: (id) => {
            updateLikeCache(queryClient, handle, id, true);
            updateLikeCacheOnce(queryClient, id, true);
            updateNotificationsLikedCache(queryClient, handle, id, true);
        },
        onError(error: {message: string, statusCode: number}, id) {
            updateLikeCache(queryClient, handle, id, false);
            updateLikeCacheOnce(queryClient, id, false);
            updateNotificationsLikedCache(queryClient, handle, id, false);

            if (error.statusCode === 403) {
                renderBlockedError();
            }

            if (error.statusCode === 429) {
                renderRateLimitError();
            }
        }
    });
}

export function useUnlikeMutationForUser(handle: string) {
    const queryClient = useQueryClient();

    return useMutation({
        async mutationFn(id: string) {
            const siteUrl = await getSiteUrl();
            const api = createActivityPubAPI(handle, siteUrl);

            return api.unlike(id);
        },
        onMutate: (id) => {
            updateLikeCache(queryClient, handle, id, false);
            updateLikeCacheOnce(queryClient, id, false);
            updateNotificationsLikedCache(queryClient, handle, id, false);
        },
        onError(error: {message: string, statusCode: number}) {
            if (error.statusCode === 429) {
                renderRateLimitError();
            }
        }
    });
}

export function useBlockDomainMutationForUser(handle: string) {
    const queryClient = useQueryClient();

    return useMutation({
        async mutationFn(data: {url: string, handle?: string}) {
            const siteUrl = await getSiteUrl();
            const api = createActivityPubAPI(handle, siteUrl);

            return api.blockDomain(new URL(data.url));
        },
        onMutate: (data: {url: string, handle?: string}) => {
            if (!data.handle) {
                return;
            }
            queryClient.setQueryData(
                QUERY_KEYS.account(data.handle),
                (currentAccount?: Account) => {
                    if (!currentAccount) {
                        return currentAccount;
                    }
                    return {
                        ...currentAccount,
                        domainBlockedByMe: true,
                        followedByMe: false,
                        followsMe: false
                    };
                }
            );
        },
        onError(error: {message: string, statusCode: number}) {
            if (error.statusCode === 429) {
                renderRateLimitError();
            }
        }
    });
}

export function useUnblockDomainMutationForUser(handle: string) {
    const queryClient = useQueryClient();

    return useMutation({
        async mutationFn(data: {url: string, handle?: string}) {
            const siteUrl = await getSiteUrl();
            const api = createActivityPubAPI(handle, siteUrl);

            return api.unblockDomain(new URL(data.url));
        },
        onMutate: (data: {url: string, handle?: string}) => {
            if (!data.handle) {
                return;
            }
            queryClient.setQueryData(
                QUERY_KEYS.account(data.handle),
                (currentAccount?: Account) => {
                    if (!currentAccount) {
                        return currentAccount;
                    }
                    return {
                        ...currentAccount,
                        domainBlockedByMe: false
                    };
                }
            );
        },
        onError(error: {message: string, statusCode: number}) {
            if (error.statusCode === 429) {
                renderRateLimitError();
            }
        }
    });
}

export function useBlockMutationForUser(handle: string) {
    const queryClient = useQueryClient();

    return useMutation({
        async mutationFn(account: Account) {
            const siteUrl = await getSiteUrl();
            const api = createActivityPubAPI(handle, siteUrl);

            return api.block(new URL(account.apId));
        },
        onMutate: (account: Account) => {
            queryClient.setQueryData(
                QUERY_KEYS.account(account.handle),
                (currentAccount?: Account) => {
                    if (!currentAccount) {
                        return currentAccount;
                    }
                    return {
                        ...currentAccount,
                        blockedByMe: true,
                        followedByMe: false,
                        followsMe: false
                    };
                }
            );
            queryClient.invalidateQueries({queryKey: QUERY_KEYS.feed});
            queryClient.invalidateQueries({queryKey: QUERY_KEYS.inbox});
        },
        onError(error: {message: string, statusCode: number}) {
            if (error.statusCode === 429) {
                renderRateLimitError();
            }
        }
    });
}

export function useUnblockMutationForUser(handle: string) {
    const queryClient = useQueryClient();

    return useMutation({
        async mutationFn(account: Account) {
            const siteUrl = await getSiteUrl();
            const api = createActivityPubAPI(handle, siteUrl);

            return api.unblock(new URL(account.apId));
        },
        onMutate: (account: Account) => {
            queryClient.setQueryData(
                QUERY_KEYS.account(account.handle),
                (currentAccount?: Account) => {
                    if (!currentAccount) {
                        return currentAccount;
                    }
                    return {
                        ...currentAccount,
                        blockedByMe: false
                    };
                }
            );
        },
        onError(error: {message: string, statusCode: number}) {
            if (error.statusCode === 429) {
                renderRateLimitError();
            }
        }
    });
}

function updateRepostCache(queryClient: QueryClient, handle: string, id: string, reposted: boolean) {
    const queryKeys = [
        QUERY_KEYS.feed,
        QUERY_KEYS.inbox,
        QUERY_KEYS.profilePosts('index')
    ];

    // Add handle-specific profile posts if different from index
    if (handle !== 'index') {
        queryKeys.push(QUERY_KEYS.profilePosts(handle));
    }

    for (const queryKey of queryKeys) {
        // Handle paginated caches (feed, inbox, etc.)
        queryClient.setQueriesData(queryKey, (current?: {pages: {posts: Activity[]}[]}) => {
            if (current === undefined) {
                return current;
            }

            return {
                ...current,
                pages: current.pages.map((page: {posts: Activity[]}) => {
                    return {
                        ...page,
                        posts: page.posts.map((item: Activity) => {
                            if (item.object.id === id) {
                                return {
                                    ...item,
                                    object: {
                                        ...item.object,
                                        reposted: reposted,
                                        repostCount: Math.max(reposted ? item.object.repostCount + 1 : item.object.repostCount - 1, 0)
                                    }
                                };
                            }

                            return item;
                        })
                    };
                })
            };
        });
    }
}

// Update non-paginated caches (should only be called once per mutation)
function updateRepostCacheOnce(queryClient: QueryClient, id: string, reposted: boolean) {
    // Handle reply chain cache (used by Note.tsx and Reader.tsx via useReplyChainForUser)
    const replyChainQueryKey = QUERY_KEYS.replyChain(null);
    queryClient.setQueriesData(replyChainQueryKey, (current?: ReplyChainResponse) => {
        if (!current) {
            return current;
        }

        const updatePost = (post: Post) => {
            if (post.id === id) {
                return {
                    ...post,
                    repostedByMe: reposted,
                    repostCount: Math.max(reposted ? (post.repostCount || 0) + 1 : (post.repostCount || 0) - 1, 0)
                };
            }
            return post;
        };

        return {
            ...current,
            post: updatePost(current.post),
            ancestors: {
                ...current.ancestors,
                chain: current.ancestors.chain.map(updatePost)
            },
            children: current.children.map(child => ({
                ...child,
                post: updatePost(child.post),
                chain: child.chain.map(updatePost)
            }))
        };
    });
}

export function useRepostMutationForUser(handle: string) {
    const queryClient = useQueryClient();

    return useMutation({
        async mutationFn(id: string) {
            const siteUrl = await getSiteUrl();
            const api = createActivityPubAPI(handle, siteUrl);

            return api.repost(id);
        },
        onMutate: (id) => {
            updateRepostCache(queryClient, handle, id, true);
            updateRepostCacheOnce(queryClient, id, true);
            updateNotificationsRepostCache(queryClient, handle, id, true);
        },
        onError(error: {message: string, statusCode: number}, id) {
            updateRepostCache(queryClient, handle, id, false);
            updateRepostCacheOnce(queryClient, id, false);
            updateNotificationsRepostCache(queryClient, handle, id, false);
            if (error.statusCode === 403) {
                renderBlockedError();
            }
            if (error.statusCode === 429) {
                renderRateLimitError();
            }
        }
    });
}

export function useDerepostMutationForUser(handle: string) {
    const queryClient = useQueryClient();

    return useMutation({
        async mutationFn(id: string) {
            const siteUrl = await getSiteUrl();
            const api = createActivityPubAPI(handle, siteUrl);

            return api.derepost(id);
        },
        onMutate: (id) => {
            updateRepostCache(queryClient, handle, id, false);
            updateRepostCacheOnce(queryClient, id, false);
            updateNotificationsRepostCache(queryClient, handle, id, false);
        },
        onError(error: {message: string, statusCode: number}) {
            if (error.statusCode === 429) {
                renderRateLimitError();
            }
        }
    });
}

export function useUserDataForUser(handle: string) {
    return useQuery({
        queryKey: QUERY_KEYS.user(handle),
        async queryFn() {
            const siteUrl = await getSiteUrl();
            const api = createActivityPubAPI(handle, siteUrl);

            return api.getUser();
        }
    });
}

export function useUnfollowMutationForUser(handle: string, onSuccess: () => void, onError: () => void) {
    const queryClient = useQueryClient();

    return useMutation({
        async mutationFn(username: string) {
            const siteUrl = await getSiteUrl();
            const api = createActivityPubAPI(handle, siteUrl);

            return api.unfollow(username);
        },
        onSuccess(_, fullHandle) {
            // Update the "isFollowing" and "followerCount" properties of the profile being unfollowed
            const profileQueryKey = QUERY_KEYS.account(fullHandle === 'me' ? 'index' : fullHandle);

            queryClient.setQueryData(profileQueryKey, (currentProfile?: {followedByMe: boolean, followerCount: number}) => {
                if (!currentProfile) {
                    return currentProfile;
                }

                return {
                    ...currentProfile,
                    followedByMe: false,
                    followerCount: currentProfile.followerCount - 1 < 0 ? 0 : currentProfile.followerCount - 1
                };
            });

            // Update the profile followers query cache for the profile being unfollowed
            const profileFollowersQueryKey = QUERY_KEYS.accountFollows(fullHandle, 'followers');

            queryClient.setQueryData(profileFollowersQueryKey, (oldData?: {
                pages: Array<{
                    accounts: Array<{
                        id: string;
                        type: string;
                        preferredUsername: string;
                        name: string;
                        url: string;
                        icon: {
                            type: string;
                            url: string;
                            },
                        isFollowing: boolean;
                    }>;
                }>;
            }) => {
                if (!oldData?.pages?.[0]) {
                    return oldData;
                }

                const currentAccount = queryClient.getQueryData<Account>(QUERY_KEYS.account('index'));
                if (!currentAccount) {
                    return oldData;
                }

                return {
                    ...oldData,
                    pages: oldData.pages.map((page: {
                        accounts: Array<{
                                id: string;
                                type: string;
                                preferredUsername: string;
                                name: string;
                                url: string;
                                icon: {
                                    type: string;
                                    url: string;
                                },
                            isFollowing: boolean;
                        }>;
                    }) => ({
                        ...page,
                        accounts: page.accounts.filter((follower: {
                            id: string;
                            type: string;
                            preferredUsername: string;
                            name: string;
                            url: string;
                            icon: {
                                type: string;
                                url: string;
                                },
                            isFollowing: boolean;
                        }) => follower.name !== currentAccount.name)
                    }))
                };
            });

            // Update the "followingCount" property of the account performing the follow
            const accountQueryKey = QUERY_KEYS.account('index');

            queryClient.setQueryData(accountQueryKey, (currentAccount?: { followingCount: number }) => {
                if (!currentAccount) {
                    return currentAccount;
                }

                return {
                    ...currentAccount,
                    followingCount: currentAccount.followingCount - 1
                };
            });

            const followingHandle = handle === 'index' ? 'me' : handle;
            const accountFollowsQueryKey = QUERY_KEYS.accountFollows(followingHandle, 'following');
            const existingData = queryClient.getQueryData(accountFollowsQueryKey);
            
            // Update the following list cache if it exists, otherwise invalidate
            if (existingData) {
                queryClient.setQueryData(accountFollowsQueryKey, (oldData?: {
                    pages: Array<{
                        accounts: Array<{
                            id: string;
                            name: string;
                            handle: string;
                            avatarUrl: string;
                            blockedByMe: boolean;
                            domainBlockedByMe: boolean;
                            isFollowing: boolean;
                        }>;
                    }>;
                }) => {
                    if (!oldData?.pages) {
                        return oldData;
                    }

                    return {
                        ...oldData,
                        pages: oldData.pages.map(page => ({
                            ...page,
                            accounts: page.accounts.filter(account => account.handle !== fullHandle)
                        }))
                    };
                });
            } else {
                // Cache doesn't exist, invalidate to fetch fresh data when needed
                queryClient.invalidateQueries({queryKey: accountFollowsQueryKey});
            }

            // Update explore profiles cache
            queryClient.setQueryData(QUERY_KEYS.exploreProfiles(handle), (current: {pages: Array<{results: Record<string, { categoryName: string; sites: Account[] }>}>} | undefined) => {
                if (!current) {
                    return current;
                }

                const updatedPages = current.pages.map((page) => {
                    const updatedResults = Object.entries(page.results).reduce((acc, [categoryKey, category]) => {
                        const updatedSites = category.sites.map((profile) => {
                            if (profile.handle === fullHandle) {
                                return {
                                    ...profile,
                                    followedByMe: false,
                                    followerCount: Math.max(0, profile.followerCount - 1)
                                };
                            }
                            return profile;
                        });

                        acc[categoryKey] = {
                            ...category,
                            sites: updatedSites
                        };

                        return acc;
                    }, {} as Record<string, { categoryName: string; sites: Account[] }>);

                    return {
                        ...page,
                        results: updatedResults
                    };
                });

                return {
                    ...current,
                    pages: updatedPages
                };
            });

            // Update suggested profiles cache (for all limit values)
            queryClient.setQueriesData({queryKey: ['suggested_profiles_json'], exact: false}, (current: Account[] | undefined) => {
                if (!current) {
                    return current;
                }

                return current.map((profile) => {
                    if (profile.handle === fullHandle) {
                        return {
                            ...profile,
                            followedByMe: false,
                            followerCount: Math.max(0, profile.followerCount - 1)
                        };
                    }
                    return profile;
                });
            });

            updateFollowCache(queryClient, handle, fullHandle, false);

            onSuccess();
        },
        onError: (error: {message: string, statusCode: number}) => {
            if (error.statusCode === 429) {
                renderRateLimitError();
            }
            onError();
        }
    });
}

export function useFollowMutationForUser(handle: string, onSuccess: () => void, onError: () => void) {
    const queryClient = useQueryClient();

    return useMutation({
        async mutationFn(username: string) {
            const siteUrl = await getSiteUrl();
            const api = createActivityPubAPI(handle, siteUrl);

            return api.follow(username);
        },
        onSuccess(_, fullHandle) {
            // Update the "isFollowing" and "followerCount" properties of the profile being followed
            const profileQueryKey = QUERY_KEYS.account(fullHandle === 'me' ? 'index' : fullHandle);

            queryClient.setQueryData(profileQueryKey, (currentProfile?: {followedByMe: boolean, followerCount: number}) => {
                if (!currentProfile) {
                    return currentProfile;
                }

                return {
                    ...currentProfile,
                    followedByMe: true,
                    followerCount: currentProfile.followerCount + 1
                };
            });

            // Update the "followingCount" property of the account performing the follow
            const accountQueryKey = QUERY_KEYS.account('index');

            queryClient.setQueryData(accountQueryKey, (currentAccount?: { followingCount: number }) => {
                if (!currentAccount) {
                    return currentAccount;
                }

                return {
                    ...currentAccount,
                    followingCount: currentAccount.followingCount + 1
                };
            });

            const profileFollowersQueryKey = QUERY_KEYS.accountFollows(fullHandle, 'followers');

            const followingHandle = handle === 'index' ? 'me' : handle;
            const accountFollowsQueryKey = QUERY_KEYS.accountFollows(followingHandle, 'following');
            const existingData = queryClient.getQueryData(accountFollowsQueryKey);
            
            // Update the following list cache if it exists, otherwise invalidate
            if (existingData) {
                queryClient.setQueryData(accountFollowsQueryKey, (oldData?: {
                    pages: Array<{
                        accounts: Array<{
                            id: string;
                            name: string;
                            handle: string;
                            avatarUrl: string;
                            blockedByMe: boolean;
                            domainBlockedByMe: boolean;
                            isFollowing: boolean;
                        }>;
                    }>;
                }) => {
                    if (!oldData?.pages?.[0]) {
                        return oldData;
                    }

                    const followedAccount = queryClient.getQueryData<Account>(QUERY_KEYS.account(fullHandle === 'me' ? 'index' : fullHandle));
                    if (!followedAccount) {
                        return oldData;
                    }

                    const newFollowing = {
                        id: followedAccount.id,
                        name: followedAccount.name,
                        handle: followedAccount.handle,
                        avatarUrl: followedAccount.avatarUrl,
                        blockedByMe: followedAccount.blockedByMe,
                        domainBlockedByMe: followedAccount.domainBlockedByMe,
                        isFollowing: true
                    };

                    return {
                        ...oldData,
                        pages: [{
                            ...oldData.pages[0],
                            accounts: [newFollowing, ...oldData.pages[0].accounts]
                        }, ...oldData.pages.slice(1)]
                    };
                });
            } else {
                queryClient.invalidateQueries({queryKey: accountFollowsQueryKey});
            }

            // Update explore profiles cache
            queryClient.setQueryData(QUERY_KEYS.exploreProfiles(handle), (current: {pages: Array<{results: Record<string, { categoryName: string; sites: Account[] }>}>} | undefined) => {
                if (!current) {
                    return current;
                }

                const updatedPages = current.pages.map((page) => {
                    const updatedResults = Object.entries(page.results).reduce((acc, [categoryKey, category]) => {
                        const updatedSites = category.sites.map((profile) => {
                            if (profile.handle === fullHandle) {
                                return {
                                    ...profile,
                                    followedByMe: true,
                                    followerCount: profile.followerCount + 1
                                };
                            }
                            return profile;
                        });

                        acc[categoryKey] = {
                            ...category,
                            sites: updatedSites
                        };

                        return acc;
                    }, {} as Record<string, { categoryName: string; sites: Account[] }>);

                    return {
                        ...page,
                        results: updatedResults
                    };
                });

                return {
                    ...current,
                    pages: updatedPages
                };
            });

            // Update suggested profiles cache (for all limit values)
            queryClient.setQueriesData({queryKey: ['suggested_profiles_json'], exact: false}, (current: Account[] | undefined) => {
                if (!current) {
                    return current;
                }

                return current.map((profile) => {
                    if (profile.handle === fullHandle) {
                        return {
                            ...profile,
                            followedByMe: true,
                            followerCount: profile.followerCount + 1
                        };
                    }
                    return profile;
                });
            });

            // Add new follower to the followers list cache
            queryClient.setQueryData(profileFollowersQueryKey, (oldData?: {
                pages: Array<{
                    accounts: Array<{
                        id: string;
                        type: string;
                        preferredUsername: string;
                        name: string;
                        url: string;
                        icon: {
                            type: string;
                            url: string;
                            },
                        isFollowing: boolean;
                    }>;
                }>;
            }) => {
                if (!oldData?.pages?.[0]) {
                    return oldData;
                }

                const currentAccount = queryClient.getQueryData<Account>(QUERY_KEYS.account('index'));
                if (!currentAccount) {
                    return oldData;
                }

                const newFollower = {
                    id: currentAccount.url,
                    type: 'Person',
                    preferredUsername: 'index',
                    name: currentAccount.name,
                    url: currentAccount.url,
                    handle: `index@${new URL(currentAccount.url).hostname}`,
                    icon: {
                        type: 'Image',
                        url: currentAccount.avatarUrl
                    },
                    isFollowing: false
                };

                return {
                    ...oldData,
                    pages: [{
                        ...oldData.pages[0],
                        accounts: [newFollower, ...oldData.pages[0].accounts]
                    }, ...oldData.pages.slice(1)]
                };
            });

            updateFollowCache(queryClient, handle, fullHandle, true);

            onSuccess();
        },
        onError(error: {message: string, statusCode: number}) {
            onError();

            if (error.statusCode === 429) {
                renderRateLimitError();
            }

            if (error.statusCode === 403) {
                renderBlockedError();
            }
        }
    });
}

export function useSearchForUser(handle: string, query: string) {
    const queryClient = useQueryClient();
    const queryKey = QUERY_KEYS.searchResults(query);

    const searchQuery = useQuery({
        queryKey,
        enabled: query.length > 0,
        refetchOnMount: 'always',
        async queryFn() {
            const siteUrl = await getSiteUrl();
            const api = createActivityPubAPI(handle, siteUrl);

            return api.search(query);
        }
    });

    const updateAccountSearchResult = (id: string, updated: Partial<AccountSearchResult>) => {
        // Update the account search result stored in the search results query cache
        queryClient.setQueryData(queryKey, (current: SearchResults | undefined) => {
            if (!current) {
                return current;
            }

            return {
                ...current,
                accounts: current.accounts.map((item: AccountSearchResult) => {
                    if (item.id === id) {
                        return {...item, ...updated};
                    }

                    return item;
                })
            };
        });
    };

    return {searchQuery, updateAccountSearchResult};
}

function prependActivityToPaginatedCollection(
    queryClient: QueryClient,
    queryKey: string[],
    collection: 'posts' | 'data',
    activity: Activity
) {
    queryClient.setQueryData(queryKey, (current: {
        pages: Array<{
            [key: string]: Activity[]
        }>
    } | undefined) => {
        if (!current) {
            return current;
        }

        return {
            ...current,
            pages: current.pages.map((page, idx: number) => {
                if (idx === 0) {
                    return {
                        ...page,
                        [collection]: [activity, ...page[collection]]
                    };
                }
                return page;
            })
        };
    });
}

function updateActivityInPaginatedCollection(
    queryClient: QueryClient,
    queryKey: string[],
    collection: 'posts' | 'data',
    id: string,
    update: (activity: Activity) => Activity
) {
    queryClient.setQueryData(queryKey, (current: {
        pages: Array<{
            [key: string]: Activity[]
        }>
    } | undefined) => {
        if (!current) {
            return current;
        }

        return {
            ...current,
            pages: current.pages.map((page) => {
                return {
                    ...page,
                    [collection]: page[collection].map((item: Activity) => {
                        if (item.id === id) {
                            return update(item);
                        }
                        return item;
                    })
                };
            })
        };
    });
}

function removeActivityFromPaginatedCollection(
    queryClient: QueryClient,
    queryKey: string[],
    collection: 'posts' | 'data',
    id: string
) {
    queryClient.setQueryData(queryKey, (current: {
        pages: Array<{
            [key: string]: Activity[]
        }>
    } | undefined) => {
        if (!current) {
            return current;
        }

        return {
            ...current,
            pages: current.pages.map((page) => {
                return {
                    ...page,
                    [collection]: page[collection].filter(item => item.id !== id)
                };
            })
        };
    });
}

export function useReplyMutationForUser(handle: string, actorProps?: ActorProperties) {
    const queryClient = useQueryClient();

    return useMutation({
        async mutationFn({inReplyTo, content, imageUrl, altText}: {inReplyTo: string, content: string, imageUrl?: string, altText?: string}) {
            const siteUrl = await getSiteUrl();
            const api = createActivityPubAPI(handle, siteUrl);

            const image = imageUrl ? {url: imageUrl, altText} : undefined;
            return api.reply(inReplyTo, content, image);
        },
        onMutate: ({inReplyTo}) => {
            if (!actorProps) {
                throw new Error('Cannot create reply without actor props');
            }

            const id = generatePendingActivityId();

            // Increment the reply count of the inReplyTo post in the feed
            updateReplyCache(queryClient, inReplyTo, 1);

            // Update reply count in reply chain cache (for child replies)
            updateReplyCacheOnce(queryClient, inReplyTo, 1);

            // Update reply count in notifications
            updateNotificationsReplyCountCache(queryClient, handle, inReplyTo, 1);

            return {id};
        },
        onSuccess: (activity: Activity, variables) => {
            if (activity.id === undefined) {
                throw new Error('Activity returned from API has no id');
            }

            // Invalidate reply chain cache to refetch with new reply
            queryClient.invalidateQueries({queryKey: QUERY_KEYS.replyChain(variables.inReplyTo)});
        },
        onError(error: {message: string, statusCode: number}, variables) {
            // eslint-disable-next-line no-console
            console.error(error);

            // Decrement the reply count of the inReplyTo post in the feed
            updateReplyCache(queryClient, variables.inReplyTo, -1);

            // Update reply count in reply chain cache (for child replies)
            updateReplyCacheOnce(queryClient, variables.inReplyTo, -1);

            // Update reply count in notifications
            updateNotificationsReplyCountCache(queryClient, handle, variables.inReplyTo, -1);

            // We do not need to decrement the reply count of the inReplyTo post
            // in the thread as this is handled locally in the ArticleModal component

            if (error.statusCode === 403) {
                renderBlockedError();
            }

            if (error.statusCode === 429) {
                renderRateLimitError();
            }

            toast.error('An error occurred while sending your reply.');
        }
    });
}

export function useNoteMutationForUser(handle: string, actorProps?: ActorProperties) {
    const queryClient = useQueryClient();
    const queryKeyFeed = QUERY_KEYS.feed;
    const queryKeyOutbox = QUERY_KEYS.outbox(handle);
    const queryKeyPostsByAccount = QUERY_KEYS.profilePosts('index');

    return useMutation({
        async mutationFn({content, imageUrl, altText}: {content: string, imageUrl?: string, altText?: string}) {
            const siteUrl = await getSiteUrl();
            const api = createActivityPubAPI(handle, siteUrl);

            const image = imageUrl ? {url: imageUrl, altText} : undefined;
            return api.note(content, image);
        },
        onMutate: ({content, imageUrl}) => {
            if (!actorProps) {
                throw new Error('Cannot create note without actor props');
            }

            const formattedContent = formatPendingActivityContent(content);

            const id = generatePendingActivityId();
            const activity = generatePendingActivity(actorProps, id, formattedContent, imageUrl);

            prependActivityToPaginatedCollection(queryClient, queryKeyFeed, 'posts', activity);
            prependActivityToPaginatedCollection(queryClient, queryKeyOutbox, 'data', activity);

            // Add to profile tab (postsByAccount)
            prependActivityToPaginatedCollection(queryClient, queryKeyPostsByAccount, 'posts', activity);

            return {id};
        },
        onSuccess: (post: Post, _variables, context) => {
            if (post.id === undefined) {
                throw new Error('Post returned from API has no id');
            }
            const activity = mapPostToActivity(post);

            updateActivityInPaginatedCollection(queryClient, queryKeyFeed, 'posts', context?.id ?? '', () => activity);
            updateActivityInPaginatedCollection(queryClient, queryKeyOutbox, 'data', context?.id ?? '', () => activity);
            updateActivityInPaginatedCollection(queryClient, queryKeyPostsByAccount, 'posts', context?.id ?? '', () => activity);
        },
        onError(error: {message: string, statusCode: number}, _variables, context) {
            // eslint-disable-next-line no-console
            console.error(error);

            removeActivityFromPaginatedCollection(queryClient, queryKeyFeed, 'posts', context?.id ?? '');
            removeActivityFromPaginatedCollection(queryClient, queryKeyOutbox, 'data', context?.id ?? '');
            removeActivityFromPaginatedCollection(queryClient, queryKeyPostsByAccount, 'posts', context?.id ?? '');

            if (error.statusCode === 429) {
                renderRateLimitError();
            }

            toast.error('An error occurred while posting your note.');
        }
    });
}

export function useAccountForUser(handle: string, profileHandle: string) {
    return useQuery({
        queryKey: QUERY_KEYS.account(profileHandle === 'me' ? 'index' : profileHandle),
        async queryFn() {
            const siteUrl = await getSiteUrl();
            const api = createActivityPubAPI(handle, siteUrl);
            return api.getAccount(profileHandle);
        }
    });
}

export function useAccountFollowsForUser(profileHandle: string, type: AccountFollowsType) {
    const queryClient = useQueryClient();
    
    return useInfiniteQuery({
        queryKey: QUERY_KEYS.accountFollows(profileHandle, type),
        async queryFn({pageParam}: {pageParam?: string}) {
            const siteUrl = await getSiteUrl();
            const api = createActivityPubAPI('index', siteUrl);

            const response = await api.getAccountFollows(profileHandle, type, pageParam);
            
            // Cache individual account data for follow mutations
            if (response.accounts) {
                response.accounts.forEach((account) => {
                    queryClient.setQueryData(QUERY_KEYS.account(account.handle), account);
                });
            }
            
            return response;
        },
        getNextPageParam(prevPage) {
            return prevPage.next;
        }
    });
}

export function useFeedForUser(options: {enabled: boolean}) {
    const queryKey = QUERY_KEYS.feed;
    const queryClient = useQueryClient();

    const feedQuery = useInfiniteQuery({
        queryKey,
        enabled: options.enabled,
        staleTime: 1 * 60 * 1000, // 1m
        async queryFn({pageParam}: {pageParam?: string}) {
            const siteUrl = await getSiteUrl();
            const api = createActivityPubAPI('index', siteUrl);
            return api.getFeed(pageParam).then((response) => {
                return {
                    posts: response.posts.map(mapPostToActivity),
                    next: response.next
                };
            });
        },
        getNextPageParam(prevPage) {
            return prevPage.next;
        }
    });

    const updateFeedActivity = (id: string, updated: Partial<Activity>) => {
        updateActivityInPaginatedCollection(
            queryClient,
            queryKey,
            'posts',
            id,
            activity => ({...activity, ...updated})
        );
    };

    return {feedQuery, updateFeedActivity};
}

export function useInboxForUser(options: {enabled: boolean}) {
    const queryKey = QUERY_KEYS.inbox;
    const queryClient = useQueryClient();

    const inboxQuery = useInfiniteQuery({
        queryKey,
        enabled: options.enabled,
        staleTime: 20 * 1000, // 20s
        async queryFn({pageParam}: {pageParam?: string}) {
            const siteUrl = await getSiteUrl();
            const api = createActivityPubAPI('index', siteUrl);
            return api.getInbox(pageParam).then((response) => {
                return {
                    posts: response.posts.map(mapPostToActivity),
                    next: response.next
                };
            });
        },
        getNextPageParam(prevPage) {
            return prevPage.next;
        }
    });

    const updateInboxActivity = (id: string, updated: Partial<Activity>) => {
        updateActivityInPaginatedCollection(
            queryClient,
            queryKey,
            'posts',
            id,
            activity => ({...activity, ...updated})
        );
    };

    return {inboxQuery, updateInboxActivity};
}

export function usePostsByAccount(profileHandle: string, options: {enabled: boolean}) {
    const queryKey = QUERY_KEYS.profilePosts(profileHandle === 'me' ? 'index' : profileHandle);
    const queryClient = useQueryClient();

    const postsByAccountQuery = useInfiniteQuery({
        queryKey,
        enabled: options.enabled,
        async queryFn({pageParam}: {pageParam?: string}) {
            const siteUrl = await getSiteUrl();
            const api = createActivityPubAPI('index', siteUrl);
            return api.getPostsByAccount(profileHandle, pageParam).then((response) => {
                return {
                    posts: response.posts.map(mapPostToActivity),
                    next: response.next
                };
            }).catch(() => {
                return {
                    posts: [],
                    next: null
                };
            });
        },
        getNextPageParam(prevPage) {
            return prevPage.next;
        }
    });

    const updatePostsByAccount = (id: string, updated: Partial<Activity>) => {
        updateActivityInPaginatedCollection(
            queryClient,
            queryKey,
            'posts',
            id,
            activity => ({...activity, ...updated})
        );
    };

    return {postsByAccountQuery, updatePostsByAccount};
}

export function usePostsLikedByAccount(options: {enabled: boolean}) {
    const queryKey = QUERY_KEYS.postsLikedByAccount;
    const queryClient = useQueryClient();

    const postsLikedByAccountQuery = useInfiniteQuery({
        queryKey,
        enabled: options.enabled,
        async queryFn({pageParam}: {pageParam?: string}) {
            const siteUrl = await getSiteUrl();
            const api = createActivityPubAPI('index', siteUrl);
            return api.getPostsLikedByAccount(pageParam).then((response) => {
                return {
                    posts: response.posts.map(mapPostToActivity),
                    next: response.next
                };
            });
        },
        getNextPageParam(prevPage) {
            return prevPage.next;
        }
    });

    const updatePostsLikedByAccount = (id: string, updated: Partial<Activity>) => {
        updateActivityInPaginatedCollection(
            queryClient,
            queryKey,
            'posts',
            id,
            activity => ({...activity, ...updated})
        );
    };

    return {postsLikedByAccountQuery, updatePostsLikedByAccount};
}

export function useDeleteMutationForUser(handle: string) {
    const queryClient = useQueryClient();

    return useMutation({
        async mutationFn(mutationData: {id: string, parentId?: string}) {
            const siteUrl = await getSiteUrl();
            const api = createActivityPubAPI(handle, siteUrl);

            return api.delete(mutationData.id);
        },
        onMutate: ({id, parentId}) => {
            // Update the feed cache:
            // - Remove the post from the feed
            // - Decrement the reply count of the parent post if applicable
            const previousFeed = queryClient.getQueryData<{pages: {posts: Activity[]}[]}>(QUERY_KEYS.feed);

            queryClient.setQueryData(QUERY_KEYS.feed, (current?: {pages: {posts: Activity[]}[]}) => {
                if (!current) {
                    return current;
                }

                return {
                    ...current,
                    pages: current.pages.map((page: {posts: Activity[]}) => {
                        return {
                            ...page,
                            posts: page.posts
                                .filter((item: Activity) => item.id !== id)
                                .map((item: Activity) => {
                                    if (item.object.id === parentId) {
                                        return {
                                            ...item,
                                            object: {
                                                ...item.object,
                                                replyCount: item.object.replyCount - 1
                                            }
                                        };
                                    }
                                    return item;
                                })
                        };
                    })
                };
            });

            // Update the inbox cache:
            // - Remove the post from the inbox
            // - Decrement the reply count of the parent post if applicable
            const previousInbox = queryClient.getQueryData<{pages: {posts: Activity[]}[]}>(QUERY_KEYS.inbox);

            queryClient.setQueryData(QUERY_KEYS.inbox, (current?: {pages: {posts: Activity[]}[]}) => {
                if (!current) {
                    return current;
                }

                return {
                    ...current,
                    pages: current.pages.map((page: {posts: Activity[]}) => {
                        return {
                            ...page,
                            posts: page.posts
                                .filter((item: Activity) => item.id !== id)
                                .map((item: Activity) => {
                                    if (item.object.id === parentId) {
                                        return {
                                            ...item,
                                            object: {
                                                ...item.object,
                                                replyCount: item.object.replyCount - 1
                                            }
                                        };
                                    }
                                    return item;
                                })
                        };
                    })
                };
            });

            // Update reply count in notifications if this was a reply
            if (parentId) {
                updateNotificationsReplyCountCache(queryClient, handle, parentId, -1);
            }

            // Update the outbox cache:
            // - Remove the post from the outbox
            const outboxQueryKey = QUERY_KEYS.outbox(handle);
            const previousOutbox = queryClient.getQueryData<{pages: {data: Activity[]}[]}>(outboxQueryKey);

            queryClient.setQueryData(outboxQueryKey, (current?: {pages: {data: Activity[]}[]}) => {
                if (!current) {
                    return current;
                }

                return {
                    ...current,
                    pages: current.pages.map((page: {data: Activity[]}) => {
                        return {
                            ...page,
                            data: page.data.filter((item: Activity) => item.object.id !== id)
                        };
                    })
                };
            });

            // Update the liked cache:
            // - Remove the post from the liked collection
            const likedQueryKey = QUERY_KEYS.liked(handle);
            const previousLiked = queryClient.getQueryData<{pages: {data: Activity[]}[]}>(likedQueryKey);
            let removedFromLiked = false;

            queryClient.setQueryData(likedQueryKey, (current?: {pages: {data: Activity[]}[]}) => {
                if (!current) {
                    return current;
                }

                return {
                    ...current,
                    pages: current.pages.map((page: {data: Activity[]}) => {
                        removedFromLiked = page.data.some((item: Activity) => item.object.id === id);

                        return {
                            ...page,
                            data: page.data.filter((item: Activity) => item.object.id !== id)
                        };
                    })
                };
            });

            // Check if post was liked by checking all possible locations
            const wasLiked = [
                QUERY_KEYS.feed,
                QUERY_KEYS.inbox,
                QUERY_KEYS.profilePosts('index'),
                QUERY_KEYS.postsLikedByAccount
            ].some((key) => {
                const queryData = queryClient.getQueryData<{pages: {posts: Activity[]}[]}>(key);
                return queryData?.pages.some(page => page.posts.some(post => post.id === id && post.object.liked));
            });

            if (wasLiked) {
                queryClient.setQueryData(QUERY_KEYS.account(handle === 'me' ? 'index' : handle), (currentAccount?: Account) => {
                    if (!currentAccount) {
                        return currentAccount;
                    }
                    return {
                        ...currentAccount,
                        likedCount: Math.max(0, currentAccount.likedCount - 1)
                    };
                });
            }

            // Update the profile posts cache:
            // - Remove the post from any profile posts collections it may be in
            const profilePostsQueryKey = QUERY_KEYS.profilePosts(null);
            const previousProfilePosts = queryClient.getQueriesData<{pages: {posts: Activity[]}[]}>(profilePostsQueryKey);

            queryClient.setQueriesData(profilePostsQueryKey, (current?: {pages: {posts: Activity[]}[]}) => {
                if (!current) {
                    return current;
                }

                return {
                    ...current,
                    pages: current.pages.map((page: {posts: Activity[]}) => {
                        return {
                            ...page,
                            posts: page.posts.filter((item: Activity) => item.object.id !== id)
                        };
                    })
                };
            });

            // Update the account cache:
            // - Decrement liked post count if the removed post was in the liked collection
            let accountQueryKey: string[] = [];
            let previousAccount: Account | undefined;

            if (removedFromLiked) {
                accountQueryKey = QUERY_KEYS.account(handle === 'me' ? 'index' : handle);
                previousAccount = queryClient.getQueryData<Account>(accountQueryKey);

                queryClient.setQueryData(accountQueryKey, (currentAccount?: {likedCount: number}) => {
                    if (!currentAccount) {
                        return currentAccount;
                    }

                    return {
                        ...currentAccount,
                        likedCount: currentAccount.likedCount - 1 < 0 ? 0 : currentAccount.likedCount - 1
                    };
                });
            }

            // Update the posts by account cache
            const postsByAccountKey = QUERY_KEYS.profilePosts('index');
            const previousPostsByAccount = queryClient.getQueryData<{pages: {posts: Activity[]}[]}>(postsByAccountKey);

            queryClient.setQueryData(postsByAccountKey, (current?: {pages: {posts: Activity[]}[]}) => {
                if (!current) {
                    return current;
                }

                return {
                    ...current,
                    pages: current.pages.map((page: {posts: Activity[]}) => ({
                        ...page,
                        posts: page.posts.filter((item: Activity) => item.object.id !== id)
                    }))
                };
            });

            // Update the liked posts cache
            const postsLikedByAccountKey = QUERY_KEYS.postsLikedByAccount;
            const previousPostsLikedByAccount = queryClient.getQueryData<{pages: {posts: Activity[]}[]}>(postsLikedByAccountKey);

            queryClient.setQueryData(postsLikedByAccountKey, (current?: {pages: {posts: Activity[]}[]}) => {
                if (!current) {
                    return current;
                }

                return {
                    ...current,
                    pages: current.pages.map((page: {posts: Activity[]}) => ({
                        ...page,
                        posts: page.posts.filter((item: Activity) => item.object.id !== id)
                    }))
                };
            });

            // Update reply chain cache
            if (parentId) {
                queryClient.setQueriesData(
                    {queryKey: ['reply_chain'], exact: false},
                    (current?: ReplyChainResponse) => {
                        if (!current) {
                            return current;
                        }

                        const updatedChildren = current.children
                            .filter(child => child.post.id !== id)
                            .map(child => ({
                                ...child,
                                chain: child.chain.filter(post => post.id !== id)
                            }));

                        let updatedPost = current.post;
                        if (current.post.id === parentId) {
                            updatedPost = {
                                ...current.post,
                                replyCount: Math.max(0, (current.post.replyCount || 0) - 1)
                            };
                        }

                        return {
                            ...current,
                            post: updatedPost,
                            children: updatedChildren
                        };
                    }
                );
            }

            return {
                previousFeed: {
                    key: QUERY_KEYS.feed,
                    data: previousFeed
                },
                previousInbox: {
                    key: QUERY_KEYS.inbox,
                    data: previousInbox
                },
                previousOutbox: {
                    key: outboxQueryKey,
                    data: previousOutbox
                },
                previousLiked: {
                    key: likedQueryKey,
                    data: previousLiked
                },
                previousProfilePosts: {
                    key: profilePostsQueryKey,
                    data: previousProfilePosts
                },
                previousAccount: removedFromLiked ? {
                    key: accountQueryKey,
                    data: previousAccount
                } : null,
                previousPostsByAccount: {
                    key: QUERY_KEYS.profilePosts('index'),
                    data: previousPostsByAccount
                },
                previousPostsLikedByAccount: {
                    key: QUERY_KEYS.postsLikedByAccount,
                    data: previousPostsLikedByAccount
                }
            };
        },
        onError: (_err, _variables, context) => {
            if (!context) {
                return;
            }

            queryClient.setQueryData(context.previousFeed.key, context.previousFeed.data);
            queryClient.setQueryData(context.previousInbox.key, context.previousInbox.data);

            queryClient.setQueryData(context.previousOutbox.key, context.previousOutbox.data);
            queryClient.setQueryData(context.previousLiked.key, context.previousLiked.data);
            queryClient.setQueriesData(context.previousProfilePosts.key, context.previousProfilePosts.data);

            if (context.previousAccount) {
                queryClient.setQueryData(context.previousAccount.key, context.previousAccount.data);
            }

            if (context.previousPostsByAccount) {
                queryClient.setQueryData(QUERY_KEYS.profilePosts('index'), context.previousPostsByAccount);
            }
            if (context.previousPostsLikedByAccount) {
                queryClient.setQueryData(QUERY_KEYS.postsLikedByAccount, context.previousPostsLikedByAccount);
            }
        },
        onSuccess: (_data, {parentId}) => {
            queryClient.invalidateQueries({
                queryKey: ['reply_chain']
            });

            if (parentId) {
                queryClient.invalidateQueries({queryKey: QUERY_KEYS.feed});
                queryClient.invalidateQueries({queryKey: QUERY_KEYS.inbox});
            }
        }
    });
}

export function useNotificationsForUser(handle: string) {
    return useInfiniteQuery({
        queryKey: QUERY_KEYS.notifications(handle),
        async queryFn({pageParam}: {pageParam?: string}) {
            const siteUrl = await getSiteUrl();
            const api = createActivityPubAPI(handle, siteUrl);

            return api.getNotifications(pageParam);
        },
        getNextPageParam(prevPage) {
            return prevPage.next;
        }
    });
}

export function useReplyChainForUser(handle: string, postApId: string | null) {
    // Use React Query for the base data
    const baseQuery = useQuery({
        queryKey: QUERY_KEYS.replyChain(postApId),
        enabled: !!postApId,
        async queryFn() {
            if (!postApId) {
                throw new Error('Post ID is required');
            }
            const siteUrl = await getSiteUrl();
            const api = createActivityPubAPI(handle, siteUrl);
            try {
                return await api.getReplies(postApId);
            } catch (error: unknown) {
                // If it's a post from a remote profile and we don't have it in our database,
                // getReplies will return a 404. Calling the post API will populate the post
                // in our database from the network, then we can recall getReplies to load the post.
                if (isApiError(error) && error.statusCode === 404) {
                    await api.getPost(postApId);
                    return await api.getReplies(postApId);
                }
                throw error;
            }
        }
    });

    // Local state for pagination (until full conversion)
    const [replyChain, setReplyChain] = useState<ReplyChainResponse | null>(null);
    const [error, setError] = useState<Error | null>(null);

    // Sync base query data with local state
    useEffect(() => {
        if (baseQuery.data) {
            setReplyChain(baseQuery.data);
        } else if (baseQuery.error) {
            setError(baseQuery.error as Error);
        }
    }, [baseQuery.data, baseQuery.error]);

    const loadMoreAncestors = useCallback(async () => {
        if (!replyChain?.ancestors.hasMore || !replyChain?.ancestors.chain[0]) {
            return;
        }

        try {
            const siteUrl = await getSiteUrl();
            const api = createActivityPubAPI(handle, siteUrl);

            const nextPage = await api.getReplies(replyChain.ancestors.chain[0].id);

            setReplyChain((prev) => {
                if (!prev) {
                    return prev;
                }
                return {
                    ...prev,
                    ancestors: {
                        chain: [...nextPage.ancestors.chain, ...prev.ancestors.chain],
                        hasMore: nextPage.ancestors.hasMore
                    }
                };
            });
        } catch (err) {
            setError(err instanceof Error ? err : new Error('Failed to load more ancestors'));
        }
    }, [handle, replyChain?.ancestors.hasMore, replyChain?.ancestors.chain]);

    const loadMoreChildren = useCallback(async () => {
        if (!replyChain?.next) {
            return;
        }
        if (!postApId) {
            return;
        }

        try {
            const siteUrl = await getSiteUrl();
            const api = createActivityPubAPI(handle, siteUrl);

            const nextPage = await api.getReplies(postApId, replyChain.next);

            setReplyChain((prev) => {
                if (!prev) {
                    return prev;
                }
                return {
                    ...prev,
                    children: [...prev.children, ...nextPage.children],
                    next: nextPage.next
                };
            });
        } catch (err) {
            setError(err instanceof Error ? err : new Error('Failed to load more children'));
        }
    }, [handle, replyChain?.next, postApId]);

    const loadMoreChildReplies = useCallback(async (childIndex: number) => {
        if (!replyChain?.children[childIndex]?.hasMore) {
            return;
        }

        try {
            const siteUrl = await getSiteUrl();
            const api = createActivityPubAPI(handle, siteUrl);
            const child = replyChain.children[childIndex];

            // Use the second-to-last reply as the starting point for pagination
            // This ensures we get proper continuity without gaps
            const replyForPagination = child.chain.length > 1
                ? child.chain[child.chain.length - 2]
                : child.post;

            const nextPage = await api.getReplies(replyForPagination.id);

            const moreReplies = nextPage.children[0].chain;

            setReplyChain((prev) => {
                if (!prev) {
                    return prev;
                }
                const newChildren = [...prev.children];
                newChildren[childIndex] = {
                    ...child,
                    chain: [...child.chain, ...moreReplies],
                    hasMore: nextPage.children[0].hasMore
                };
                return {
                    ...prev,
                    children: newChildren
                };
            });
        } catch (err) {
            setError(err instanceof Error ? err : new Error('Failed to load more child replies'));
        }
    }, [handle, replyChain]);

    return {
        data: replyChain,
        isLoading: baseQuery.isLoading,
        error,
        loadMoreAncestors,
        loadMoreChildren,
        loadMoreChildReplies,
        hasMoreAncestors: !!replyChain?.ancestors.hasMore,
        hasMoreChildren: !!replyChain?.next,
        hasMoreChildReplies: (childIndex: number) => !!replyChain?.children[childIndex]?.hasMore
    };
}

export function useUpdateAccountMutationForUser(handle: string) {
    const queryClient = useQueryClient();

    return useMutation({
        async mutationFn(data: {
            name: string;
            username: string;
            bio: string;
            avatarUrl: string;
            bannerImageUrl: string;
        }) {
            const siteUrl = await getSiteUrl();
            const api = createActivityPubAPI(handle, siteUrl);

            return api.updateAccount(data);
        },
        onSuccess() {
            queryClient.invalidateQueries({
                queryKey: QUERY_KEYS.account('index')
            });
        }
    });
}

export async function uploadFile(file: File) {
    const siteUrl = await getSiteUrl();
    const api = createActivityPubAPI('index', siteUrl);
    return api.upload(file);
}

export function useNotificationsCountForUser(handle: string) {
    const siteUrl = useCallback(async () => await getSiteUrl(), []);
    const api = useCallback(async () => {
        const url = await siteUrl();
        return createActivityPubAPI(handle, url);
    }, [handle, siteUrl]);

    return useQuery({
        queryKey: QUERY_KEYS.notificationsCount(handle),
        async queryFn() {
            const activityPubAPI = await api();
            const response = await activityPubAPI.getNotificationsCount();
            return response.count;
        }
    });
}

export function useResetNotificationsCountForUser(handle: string) {
    const queryClient = useQueryClient();
    const siteUrl = useCallback(async () => await getSiteUrl(), []);
    const api = useCallback(async () => {
        const url = await siteUrl();
        return createActivityPubAPI(handle, url);
    }, [handle, siteUrl]);

    return useMutation({
        async mutationFn() {
            // Clear the count in the cache
            queryClient.setQueryData(QUERY_KEYS.notificationsCount(handle), 0);
            const activityPubAPI = await api();
            return activityPubAPI.resetNotificationsCount();
        }
    });
}

function useFilteredAccountsFromJSON(options: {
    excludeFollowing?: boolean;
    excludeCurrentUser?: boolean;
} = {}) {
    const {
        excludeFollowing = true,
        excludeCurrentUser = false
    } = options;
    const {data: followingData, hasNextPage, fetchNextPage, isLoading: isLoadingFollowing} = useAccountFollowsForUser('me', 'following');
    const {data: blockedAccountsData, hasNextPage: hasNextBlockedAccounts, fetchNextPage: fetchNextBlockedAccounts, isLoading: isLoadingBlockedAccounts} = useBlockedAccountsForUser('me');
    const {data: blockedDomainsData, hasNextPage: hasNextBlockedDomains, fetchNextPage: fetchNextBlockedDomains, isLoading: isLoadingBlockedDomains} = useBlockedDomainsForUser('me');
    const currentAccountQuery = useAccountForUser('index', 'me');
    const {data: currentUser, isLoading: isLoadingCurrentUser} = currentAccountQuery;

    useEffect(() => {
        if (hasNextPage && !isLoadingFollowing) {
            fetchNextPage();
        }
    }, [hasNextPage, fetchNextPage, isLoadingFollowing, followingData?.pages]);

    useEffect(() => {
        if (hasNextBlockedAccounts && !isLoadingBlockedAccounts) {
            fetchNextBlockedAccounts();
        }
    }, [hasNextBlockedAccounts, fetchNextBlockedAccounts, isLoadingBlockedAccounts, blockedAccountsData?.pages]);

    useEffect(() => {
        if (hasNextBlockedDomains && !isLoadingBlockedDomains) {
            fetchNextBlockedDomains();
        }
    }, [hasNextBlockedDomains, fetchNextBlockedDomains, isLoadingBlockedDomains, blockedDomainsData?.pages]);

    const followingIds = useMemo(() => {
        const ids = new Set<string>();
        if (followingData?.pages) {
            followingData.pages.forEach((page) => {
                page.accounts.forEach((account) => {
                    ids.add(account.id);
                });
            });
        }
        return ids;
    }, [followingData]);

    const blockedAccountIds = useMemo(() => {
        const ids = new Set<string>();
        if (blockedAccountsData?.pages) {
            blockedAccountsData.pages.forEach((page) => {
                page.accounts?.forEach((account: Account) => {
                    ids.add(account.id);
                });
            });
        }
        return ids;
    }, [blockedAccountsData]);

    const blockedDomains = useMemo(() => {
        const domains = new Set<string>();
        if (blockedDomainsData?.pages) {
            blockedDomainsData.pages.forEach((page) => {
                page.domains?.forEach((domain: Account | string) => {
                    if (typeof domain === 'string') {
                        domains.add(domain);
                    } else if (domain.url) {
                        try {
                            const url = new URL(domain.url);
                            domains.add(url.hostname);
                        } catch {
                            // Ignore invalid URLs
                        }
                    }
                });
            });
        }
        return domains;
    }, [blockedDomainsData]);

    const fetchAndFilterAccounts = useCallback(async () => {
        try {
            const response = await fetch('https://storage.googleapis.com/prd-activitypub-populate-explore-json/explore/accounts.json');
            if (!response.ok) {
                throw new Error('Failed to fetch explore accounts');
            }

            const data = await response.json();
            const accounts = data.accounts as Account[];

            const filteredAccounts = accounts.filter((account) => {
                if (excludeFollowing && followingIds.has(account.id)) {
                    return false;
                }

                if (blockedAccountIds.has(account.id)) {
                    return false;
                }

                if (excludeCurrentUser && currentUser && account.handle === currentUser.handle) {
                    return false;
                }

                const parts = account.handle.split('@').filter(part => part.length > 0);
                const accountDomain = parts.length > 1 ? parts[parts.length - 1] : null;
                if (accountDomain && blockedDomains.has(accountDomain)) {
                    return false;
                }

                return true;
            });

            const accountsWithDefaults = filteredAccounts.map(account => ({
                ...account,
                followedByMe: followingIds.has(account.id),
                blockedByMe: false,
                domainBlockedByMe: false
            }));

            return accountsWithDefaults;
        } catch (error) {
            return [];
        }
    }, [followingIds, blockedAccountIds, blockedDomains, excludeFollowing, excludeCurrentUser, currentUser]);

    const isLoading = isLoadingFollowing || isLoadingBlockedAccounts || isLoadingBlockedDomains || isLoadingCurrentUser;

    // Track if we have finished loading all following data
    const isFollowingDataComplete = !isLoadingFollowing && !hasNextPage;

    return {
        fetchAndFilterAccounts,
        isLoading,
        isFollowingDataComplete
    };
}

export function useExploreProfilesForUser(handle: string) {
    const queryClient = useQueryClient();
    const queryKey = QUERY_KEYS.exploreProfiles(handle);
    const {fetchAndFilterAccounts, isLoading, isFollowingDataComplete} = useFilteredAccountsFromJSON({
        excludeFollowing: false
    });

    const fetchExploreProfilesFromJSON = useCallback(async () => {
        const accounts = await fetchAndFilterAccounts();

        // Cache account data for follow mutations
        accounts.forEach((account: Account) => {
            queryClient.setQueryData(QUERY_KEYS.account(account.handle), account);
        });

        const results = {
            uncategorized: {
                categoryName: 'Recommended',
                sites: accounts
            }
        };

        return {
            results,
            nextPage: undefined
        };
    }, [fetchAndFilterAccounts, queryClient]);

    const exploreProfilesQuery = useInfiniteQuery({
        queryKey,
        queryFn: () => fetchExploreProfilesFromJSON(),
        getNextPageParam: () => undefined,
        staleTime: 60 * 60 * 1000,
        enabled: !isLoading && isFollowingDataComplete
    });

    const updateExploreProfile = (id: string, updated: Partial<Account>) => {
        queryClient.setQueryData(queryKey, (current: {pages: Array<{results: Record<string, { categoryName: string; sites: Account[] }>}>} | undefined) => {
            if (!current) {
                return current;
            }

            const updatedPages = current.pages.map((page) => {
                const updatedResults = Object.entries(page.results).reduce((acc, [categoryKey, category]) => {
                    const updatedSites = category.sites.map((profile) => {
                        if (profile.id === id) {
                            return {...profile, ...updated};
                        }
                        return profile;
                    });

                    acc[categoryKey] = {
                        ...category,
                        sites: updatedSites
                    };

                    return acc;
                }, {} as Record<string, { categoryName: string; sites: Account[] }>);

                return {
                    ...page,
                    results: updatedResults
                };
            });

            return {
                ...current,
                pages: updatedPages
            };
        });
    };

    return {
        exploreProfilesQuery,
        updateExploreProfile
    };
}

export function useSuggestedProfilesForUser(handle: string, limit = 3) {
    const queryClient = useQueryClient();
    const queryKey = QUERY_KEYS.suggestedProfiles(handle, limit);
    const {fetchAndFilterAccounts, isLoading, isFollowingDataComplete} = useFilteredAccountsFromJSON({
        excludeFollowing: true,
        excludeCurrentUser: true
    });

    const suggestedProfilesQuery = useQuery({
        queryKey,
        async queryFn() {
            const accounts = await fetchAndFilterAccounts();

            const randomAccounts = accounts
                .sort(() => Math.random() - 0.5)
                .slice(0, limit);

            // Cache account data for follow mutations
            if (randomAccounts.length > 0) {
                randomAccounts.forEach((account: Account) => {
                    queryClient.setQueryData(QUERY_KEYS.account(account.handle), account);
                });
            }

            return randomAccounts.length > 0 ? randomAccounts : null;
        },
        retry: false,
        staleTime: 60 * 60 * 1000,
        enabled: !isLoading && isFollowingDataComplete
    });

    const updateSuggestedProfile = (id: string, updated: Partial<Account>) => {
        queryClient.setQueryData(queryKey, (current: Account[] | undefined) => {
            if (!current) {
                return current;
            }

            return current.map((item: Account) => {
                if (item.id === id) {
                    return {...item, ...updated};
                }

                return item;
            });
        });
    };

    return {suggestedProfilesQuery, updateSuggestedProfile};
}
