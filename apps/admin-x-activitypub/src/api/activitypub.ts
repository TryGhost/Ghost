import {ActorProperties} from '@tryghost/admin-x-framework/api/activitypub';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Actor = any;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Activity = any;

export interface Account {
    id: string;
    name: string;
    handle: string;
    bio: string;
    url: string;
    avatarUrl: string;
    bannerImageUrl: string | null;
    customFields: Record<string, string>;
    postCount: number;
    likedCount: number;
    followingCount: number;
    followerCount: number;
    followsMe: boolean;
    followedByMe: boolean;
    attachment: {name: string, value: string}[];
}

export type AccountSearchResult = Pick<
    Account,
    'id' | 'name' | 'handle' | 'avatarUrl' | 'followedByMe' | 'followerCount'
>;

export interface SearchResults {
    accounts: AccountSearchResult[];
}

export interface Thread {
    posts: Post[];
}

export type ActivityPubCollectionResponse<T> = {data: T[], next: string | null};

export interface GetProfileFollowersResponse {
    followers: {
        actor: Actor;
        isFollowing: boolean;
    }[];
    next: string | null;
}

export interface GetProfileFollowingResponse {
    following: {
        actor: Actor;
        isFollowing: boolean;
    }[];
    next: string | null;
}

export interface GetProfilePostsResponse {
    posts: Activity[];
    next: string | null;
}

export type AccountFollowsType = 'following' | 'followers';

type GetAccountResponse = Account

export type FollowAccount = Pick<Account, 'id' | 'name' | 'handle' | 'avatarUrl'> & {isFollowing: true};

export interface GetAccountFollowsResponse {
    accounts: FollowAccount[];
    next: string | null;
}

export interface Notification {
    id: string;
    type: 'like' | 'reply' | 'repost' | 'follow';
    actor: {
        id: string;
        name: string;
        url: string;
        handle: string;
        avatarUrl: string | null;
    },
    post: null | {
        id: string;
        type: 'article' | 'note';
        title: string | null;
        content: string;
        url: string;
    },
    inReplyTo: null | {
        id: string;
        type: 'article' | 'note';
        title: string | null;
        content: string;
        url: string;
    }
}

export interface GetNotificationsResponse {
    notifications: Notification[];
    next: string | null;
}

export enum PostType {
    Note = 0,
    Article = 1,
    Tombstone = 2
}

export interface Post {
    id: string;
    type: PostType;
    title: string;
    excerpt: string;
    content: string;
    url: string;
    featureImageUrl: string | null;
    publishedAt: string;
    likeCount: number;
    likedByMe: boolean;
    replyCount: number;
    readingTimeMinutes: number;
    attachments: {
        type: string;
        mediaType: string;
        name: string;
        url: string;
    }[];
    author: Pick<Account, 'id' | 'handle' | 'avatarUrl' | 'name' | 'url'>;
    authoredByMe: boolean;
    repostCount: number;
    repostedByMe: boolean;
    repostedBy: Pick<
        Account,
        'id' | 'handle' | 'avatarUrl' | 'name' | 'url'
    > | null;
}

export interface PaginatedPostsResponse {
    posts: Post[];
    next: string | null;
}

export class ActivityPubAPI {
    constructor(
        private readonly apiUrl: URL,
        private readonly authApiUrl: URL,
        private readonly handle: string,
        private readonly fetch: (resource: URL, init?: RequestInit) => Promise<Response> = window.fetch.bind(window)
    ) {}

    private async getToken(): Promise<string | null> {
        try {
            const response = await this.fetch(this.authApiUrl);
            const json = await response.json();
            return json?.identities?.[0]?.token || null;
        } catch (err) {
            // TODO: Ping sentry?
            return null;
        }
    }

    private async fetchJSON(url: URL, method: 'DELETE' | 'GET' | 'POST' = 'GET', body?: object): Promise<object | null> {
        const token = await this.getToken();
        const options: RequestInit = {
            method,
            headers: {
                Authorization: `Bearer ${token}`,
                Accept: 'application/activity+json'
            }
        };
        if (body) {
            options.body = JSON.stringify(body);
            (options.headers! as Record<string, string>)['Content-Type'] = 'application/json';
        }
        const response = await this.fetch(url, options);

        if (response.status === 204) {
            return null;
        }

        const json = await response.json();
        return json;
    }

    async follow(username: string): Promise<Actor> {
        const url = new URL(`.ghost/activitypub/actions/follow/${username}`, this.apiUrl);
        const json = await this.fetchJSON(url, 'POST');
        return json as Actor;
    }

    async unfollow(username: string): Promise<Actor> {
        const url = new URL(`.ghost/activitypub/actions/unfollow/${username}`, this.apiUrl);
        const json = await this.fetchJSON(url, 'POST');
        return json as Actor;
    }

    async like(id: string): Promise<void> {
        const url = new URL(`.ghost/activitypub/actions/like/${encodeURIComponent(id)}`, this.apiUrl);
        await this.fetchJSON(url, 'POST');
    }

    async unlike(id: string): Promise<void> {
        const url = new URL(`.ghost/activitypub/actions/unlike/${encodeURIComponent(id)}`, this.apiUrl);
        await this.fetchJSON(url, 'POST');
    }

    async repost(id: string): Promise<void> {
        const url = new URL(`.ghost/activitypub/actions/repost/${encodeURIComponent(id)}`, this.apiUrl);
        await this.fetchJSON(url, 'POST');
    }

    async derepost(id: string): Promise<void> {
        const url = new URL(`.ghost/activitypub/actions/derepost/${encodeURIComponent(id)}`, this.apiUrl);
        await this.fetchJSON(url, 'POST');
    }

    async reply(id: string, content: string): Promise<Activity> {
        const url = new URL(`.ghost/activitypub/actions/reply/${encodeURIComponent(id)}`, this.apiUrl);
        const response = await this.fetchJSON(url, 'POST', {content});
        return response;
    }

    async note(content: string): Promise<Activity> {
        const url = new URL('.ghost/activitypub/actions/note', this.apiUrl);
        const response = await this.fetchJSON(url, 'POST', {content});
        return response;
    }

    async delete(id: string): Promise<void> {
        const url = new URL(`.ghost/activitypub/post/${encodeURIComponent(id)}`, this.apiUrl);
        await this.fetchJSON(url, 'DELETE');
    }

    get userApiUrl() {
        return new URL(`.ghost/activitypub/users/${this.handle}`, this.apiUrl);
    }

    async getUser() {
        const json = await this.fetchJSON(this.userApiUrl);
        return json as ActorProperties;
    }

    get searchApiUrl() {
        return new URL('.ghost/activitypub/actions/search', this.apiUrl);
    }

    async search(query: string): Promise<SearchResults> {
        const url = this.searchApiUrl;

        url.searchParams.set('query', query);

        const json = await this.fetchJSON(url, 'GET');

        if (json && 'accounts' in json) {
            return json as SearchResults;
        }

        return {
            accounts: []
        };
    }

    async getProfileFollowers(handle: string, next?: string): Promise<GetProfileFollowersResponse> {
        const url = new URL(`.ghost/activitypub/profile/${handle}/followers`, this.apiUrl);
        if (next) {
            url.searchParams.set('next', next);
        }

        const json = await this.fetchJSON(url);

        if (json === null) {
            return {
                followers: [],
                next: null
            };
        }

        if (!('followers' in json)) {
            return {
                followers: [],
                next: null
            };
        }

        const followers = Array.isArray(json.followers) ? json.followers : [];
        const nextPage = 'next' in json && typeof json.next === 'string' ? json.next : null;

        return {
            followers,
            next: nextPage
        };
    }

    async getProfileFollowing(handle: string, next?: string): Promise<GetProfileFollowingResponse> {
        const url = new URL(`.ghost/activitypub/profile/${handle}/following`, this.apiUrl);
        if (next) {
            url.searchParams.set('next', next);
        }

        const json = await this.fetchJSON(url);

        if (json === null) {
            return {
                following: [],
                next: null
            };
        }

        if (!('following' in json)) {
            return {
                following: [],
                next: null
            };
        }

        const following = Array.isArray(json.following) ? json.following : [];
        const nextPage = 'next' in json && typeof json.next === 'string' ? json.next : null;

        return {
            following,
            next: nextPage
        };
    }

    async getProfilePosts(handle: string, next?: string): Promise<GetProfilePostsResponse> {
        const url = new URL(`.ghost/activitypub/profile/${handle}/posts`, this.apiUrl);
        if (next) {
            url.searchParams.set('next', next);
        }

        const json = await this.fetchJSON(url);

        if (json === null) {
            return {
                posts: [],
                next: null
            };
        }

        if (!('posts' in json)) {
            return {
                posts: [],
                next: null
            };
        }

        const posts = Array.isArray(json.posts) ? json.posts : [];
        const nextPage = 'next' in json && typeof json.next === 'string' ? json.next : null;

        return {
            posts,
            next: nextPage
        };
    }

    async getThread(id: string): Promise<Thread> {
        const url = new URL(`.ghost/activitypub/thread/${encodeURIComponent(id)}`, this.apiUrl);
        const json = await this.fetchJSON(url);
        return json as Thread;
    }

    async getAccount(handle: string): Promise<GetAccountResponse> {        
        const url = new URL(`.ghost/activitypub/account/${handle}`, this.apiUrl);
        const json = await this.fetchJSON(url);

        return json as GetAccountResponse;
    }

    async getAccountFollows(type: AccountFollowsType, next?: string): Promise<GetAccountFollowsResponse> {
        const url = new URL(`.ghost/activitypub/account/${this.handle}/follows/${type}`, this.apiUrl);
        if (next) {
            url.searchParams.set('next', next);
        }

        const json = await this.fetchJSON(url);

        if (json === null) {
            return {
                accounts: [],
                next: null
            };
        }

        if (!('accounts' in json)) {
            return {
                accounts: [],
                next: null
            };
        }

        const accounts = Array.isArray(json.accounts) ? json.accounts : [];
        const nextPage = 'next' in json && typeof json.next === 'string' ? json.next : null;

        return {
            accounts,
            next: nextPage
        };
    }

    async getFeed(next?: string): Promise<PaginatedPostsResponse> {
        return this.getPaginatedPosts('.ghost/activitypub/feed', next);
    }

    async getInbox(next?: string): Promise<PaginatedPostsResponse> {
        return this.getPaginatedPosts('.ghost/activitypub/inbox', next);
    }

    async getPostsByAccount(next?: string): Promise<PaginatedPostsResponse> {
        return this.getPaginatedPosts('.ghost/activitypub/posts', next);
    }

    async getPostsLikedByAccount(next?: string): Promise<PaginatedPostsResponse> {
        return this.getPaginatedPosts('.ghost/activitypub/posts/liked', next);
    }

    private async getPaginatedPosts(endpoint: string, next?: string): Promise<PaginatedPostsResponse> {
        const url = new URL(endpoint, this.apiUrl);

        if (next) {
            url.searchParams.set('next', next);
        }

        const json = await this.fetchJSON(url);

        if (json === null || !('posts' in json)) {
            return {
                posts: [],
                next: null
            };
        }

        const posts = Array.isArray(json.posts) ? json.posts : [];
        const nextPage = 'next' in json && typeof json.next === 'string' ? json.next : null;

        return {
            posts,
            next: nextPage
        };
    }

    async getNotifications(next?: string): Promise<GetNotificationsResponse> {
        const url = new URL('.ghost/activitypub/notifications', this.apiUrl);
        if (next) {
            url.searchParams.set('next', next);
        }

        const json = await this.fetchJSON(url);

        if (json === null) {
            return {
                notifications: [],
                next: null
            };
        }

        if (!('notifications' in json)) {
            return {
                notifications: [],
                next: null
            };
        }

        const notifications = Array.isArray(json.notifications) ? json.notifications : [];
        const nextPage = 'next' in json && typeof json.next === 'string' ? json.next : null;

        return {
            notifications,
            next: nextPage
        };
    }

    async getPost(id: string): Promise<Post> {
        const url = new URL(`.ghost/activitypub/post/${encodeURIComponent(id)}`, this.apiUrl);
        const json = await this.fetchJSON(url);
        return json as Post;
    }
}
