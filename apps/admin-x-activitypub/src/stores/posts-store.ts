import {Account, Activity} from '../api/activitypub';
import {proxy, useSnapshot} from 'valtio';

interface PostsStore {
    feedPosts: Activity[];
    inboxPosts: Activity[];
    // Track profile accounts we've loaded for cross-component reactivity
    profileAccounts: Map<string, Account>;
}

// Create the proxy store
export const postsStore = proxy<PostsStore>({
    feedPosts: [],
    inboxPosts: [],
    profileAccounts: new Map()
});

// Hook to use the store in components
export function usePostsStore() {
    return useSnapshot(postsStore);
}

// Store actions
export const postsActions = {
    // Initialize posts from React Query data
    setFeedPosts(posts: Activity[]) {
        postsStore.feedPosts = posts;
    },

    setInboxPosts(posts: Activity[]) {
        postsStore.inboxPosts = posts;
    },

    // Like/Unlike actions
    toggleLike(postId: string, liked: boolean) {
        // Update in feed posts
        const feedPost = postsStore.feedPosts.find(p => p.id === postId);
        if (feedPost) {
            feedPost.object.liked = liked;
            feedPost.object.likeCount = (feedPost.object.likeCount || 0) + (liked ? 1 : -1);
        }

        // Update in inbox posts
        const inboxPost = postsStore.inboxPosts.find(p => p.id === postId);
        if (inboxPost) {
            inboxPost.object.liked = liked;
            inboxPost.object.likeCount = (inboxPost.object.likeCount || 0) + (liked ? 1 : -1);
        }
    },

    // Repost actions
    toggleRepost(postId: string, reposted: boolean) {
        // Update in feed posts
        const feedPost = postsStore.feedPosts.find(p => p.id === postId);
        if (feedPost) {
            feedPost.object.reposted = reposted;
            feedPost.object.repostCount = (feedPost.object.repostCount || 0) + (reposted ? 1 : -1);
        }

        // Update in inbox posts
        const inboxPost = postsStore.inboxPosts.find(p => p.id === postId);
        if (inboxPost) {
            inboxPost.object.reposted = reposted;
            inboxPost.object.repostCount = (inboxPost.object.repostCount || 0) + (reposted ? 1 : -1);
        }
    },

    // Follow/Unfollow actions
    toggleFollow(actorHandle: string, followed: boolean) {
        // Extract username and domain from the target handle
        const extractDomainAndUsername = (handle: string) => {
            const cleanHandle = handle.startsWith('@') ? handle.slice(1) : handle;
            const parts = cleanHandle.split('@');
            if (parts.length !== 2) {
                return null;
            }
            return {username: parts[0], domain: parts[1]};
        };

        const target = extractDomainAndUsername(actorHandle);
        if (!target) {
            return;
        }

        // Helper function to match actor by actual identity (username + domain)
        const matchesActor = (actor: {id: string; preferredUsername: string}) => {
            const actorDomain = new URL(actor.id).hostname.replace(/^www\./, '');
            return actor.preferredUsername === target.username && 
                   actorDomain === target.domain;
        };

        // Update all posts by this actor in feed
        postsStore.feedPosts.forEach((post) => {
            if (matchesActor(post.actor)) {
                post.actor.followedByMe = followed;
                if (post.actor.followerCount !== undefined) {
                    post.actor.followerCount += followed ? 1 : -1;
                }
            }
        });

        // Update all posts by this actor in inbox
        postsStore.inboxPosts.forEach((post) => {
            if (matchesActor(post.actor)) {
                post.actor.followedByMe = followed;
                if (post.actor.followerCount !== undefined) {
                    post.actor.followerCount += followed ? 1 : -1;
                }
            }
        });

        // Update profile accounts using same identity matching
        postsStore.profileAccounts.forEach((account) => {
            const accountTarget = extractDomainAndUsername(account.handle);
            if (accountTarget && accountTarget.username === target.username && accountTarget.domain === target.domain) {
                account.followedByMe = followed;
                if (account.followerCount !== undefined) {
                    account.followerCount += followed ? 1 : -1;
                }
            }
        });
    },

    // Profile account management
    setProfileAccount(handle: string, account: Account) {
        postsStore.profileAccounts.set(handle, account);
    },

    getProfileAccount(handle: string) {
        return postsStore.profileAccounts.get(handle);
    },

    // Delete action
    deletePost(postId: string) {
        // Remove from feed posts
        const feedIndex = postsStore.feedPosts.findIndex(p => p.id === postId);
        if (feedIndex !== -1) {
            postsStore.feedPosts.splice(feedIndex, 1);
        }

        // Remove from inbox posts
        const inboxIndex = postsStore.inboxPosts.findIndex(p => p.id === postId);
        if (inboxIndex !== -1) {
            postsStore.inboxPosts.splice(inboxIndex, 1);
        }
    },

    // Add new post (for replies, new posts)
    addPost(post: Activity, location: 'feed' | 'inbox' = 'feed') {
        if (location === 'feed') {
            postsStore.feedPosts.unshift(post);
        } else {
            postsStore.inboxPosts.unshift(post);
        }
    }
};