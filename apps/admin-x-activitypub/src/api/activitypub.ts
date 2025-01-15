// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Actor = any;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Activity = any;

export interface Profile {
    actor: Actor;
    handle: string;
    followerCount: number;
    followingCount: number;
    isFollowing: boolean;
}

export interface SearchResults {
    profiles: Profile[];
}

export interface ActivityThread {
    items: Activity[];
}

export type ActivityPubCollectionResponse<T> = {data: T[], next: string | null};

export interface GetFollowersForProfileResponse {
    followers: {
        actor: Actor;
        isFollowing: boolean;
    }[];
    next: string | null;
}

export interface GetFollowingForProfileResponse {
    following: {
        actor: Actor;
        isFollowing: boolean;
    }[];
    next: string | null;
}

export interface GetPostsForProfileResponse {
    posts: Activity[];
    next: string | null;
}

export type AccountFollowsType = 'following' | 'followers';

interface Account {
    id: string;
    name: string;
    handle: string;
    bio: string;
    url: string;
    avatarUrl: string;
    bannerImageUrl: string | null;
    customFields: Record<string, string>;
    postsCount: number;
    likedCount: number;
    followingCount: number;
    followerCount: number;
    followsMe: boolean;
    followedByMe: boolean;
}

type GetAccountResponse = Account

export type MinimalAccount = Pick<Account, 'id' | 'name' | 'handle' | 'avatarUrl'>;

export interface GetAccountFollowsResponse {
    accounts: MinimalAccount[];
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

    private async fetchJSON(url: URL, method: 'GET' | 'POST' = 'GET', body?: object): Promise<object | null> {
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
        const json = await response.json();
        return json;
    }

    private async getActivityPubCollection<T>(collectionUrl: URL, cursor?: string): Promise<ActivityPubCollectionResponse<T>> {
        const url = new URL(collectionUrl);
        url.searchParams.set('cursor', cursor || '0');

        const json = await this.fetchJSON(url);

        if (json === null) {
            return {
                data: [],
                next: null
            };
        }

        if (!('orderedItems' in json)) {
            return {
                data: [],
                next: null
            };
        }

        const data = Array.isArray(json.orderedItems) ? json.orderedItems : [];
        let next = 'next' in json && typeof json.next === 'string' ? json.next : null;

        if (next !== null) {
            const nextUrl = new URL(next);
            next = nextUrl.searchParams.get('cursor') || null;
        }

        return {
            data,
            next
        };
    }

    get inboxApiUrl() {
        return new URL(`.ghost/activitypub/inbox/${this.handle}`, this.apiUrl);
    }

    async getInbox(): Promise<Activity[]> {
        const json = await this.fetchJSON(this.inboxApiUrl);
        if (json === null) {
            return [];
        }
        if ('orderedItems' in json) {
            return Array.isArray(json.orderedItems) ? json.orderedItems : [json.orderedItems];
        }
        if ('items' in json) {
            return Array.isArray(json.items) ? json.items : [json.items];
        }
        return [];
    }

    get outboxApiUrl() {
        return new URL(`.ghost/activitypub/outbox/${this.handle}`, this.apiUrl);
    }

    async getOutbox(cursor?: string): Promise<ActivityPubCollectionResponse<Activity>> {
        return this.getActivityPubCollection<Activity>(this.outboxApiUrl, cursor);
    }

    get followingApiUrl() {
        return new URL(`.ghost/activitypub/following/${this.handle}`, this.apiUrl);
    }

    async getFollowing(cursor?: string): Promise<ActivityPubCollectionResponse<Actor>> {
        return this.getActivityPubCollection<Actor>(this.followingApiUrl, cursor);
    }

    get followersApiUrl() {
        return new URL(`.ghost/activitypub/followers/${this.handle}`, this.apiUrl);
    }

    async getFollowers(cursor?: string): Promise<ActivityPubCollectionResponse<Actor>> {
        return this.getActivityPubCollection<Actor>(this.followersApiUrl, cursor);
    }

    async follow(username: string): Promise<Actor> {
        const url = new URL(`.ghost/activitypub/actions/follow/${username}`, this.apiUrl);
        const json = await this.fetchJSON(url, 'POST');
        return json as Actor;
    }

    get likedApiUrl() {
        return new URL(`.ghost/activitypub/liked/${this.handle}`, this.apiUrl);
    }

    async getLiked(cursor?: string): Promise<ActivityPubCollectionResponse<Activity>> {
        return this.getActivityPubCollection<Activity>(this.likedApiUrl, cursor);
    }

    async like(id: string): Promise<void> {
        const url = new URL(`.ghost/activitypub/actions/like/${encodeURIComponent(id)}`, this.apiUrl);
        await this.fetchJSON(url, 'POST');
    }

    async unlike(id: string): Promise<void> {
        const url = new URL(`.ghost/activitypub/actions/unlike/${encodeURIComponent(id)}`, this.apiUrl);
        await this.fetchJSON(url, 'POST');
    }

    get activitiesApiUrl() {
        return new URL(`.ghost/activitypub/activities/${this.handle}`, this.apiUrl);
    }

    async getActivities(
        includeOwn: boolean = false,
        includeReplies: boolean = false,
        filter: {type?: string[]} | null = null,
        limit: number = 50,
        cursor?: string
    ): Promise<{data: Activity[], next: string | null}> {
        const url = new URL(this.activitiesApiUrl);

        url.searchParams.set('limit', limit.toString());

        if (includeOwn) {
            url.searchParams.set('includeOwn', includeOwn.toString());
        }
        if (includeReplies) {
            url.searchParams.set('includeReplies', includeReplies.toString());
        }
        if (filter) {
            url.searchParams.set('filter', JSON.stringify(filter));
        }
        if (cursor) {
            url.searchParams.set('cursor', cursor);
        }

        const json = await this.fetchJSON(url);

        if (json === null) {
            return {
                data: [],
                next: null
            };
        }

        if (!('items' in json)) {
            return {
                data: [],
                next: null
            };
        }

        const data = Array.isArray(json.items) ? json.items : [];
        const next = 'next' in json && typeof json.next === 'string' ? json.next : null;

        return {
            data,
            next
        };
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

    get userApiUrl() {
        return new URL(`.ghost/activitypub/users/${this.handle}`, this.apiUrl);
    }

    async getUser() {
        const json = await this.fetchJSON(this.userApiUrl);
        return json;
    }

    get searchApiUrl() {
        return new URL('.ghost/activitypub/actions/search', this.apiUrl);
    }

    async search(query: string): Promise<SearchResults> {
        const url = this.searchApiUrl;

        url.searchParams.set('query', query);

        const json = await this.fetchJSON(url, 'GET');

        if (json && 'profiles' in json) {
            return json as SearchResults;
        }

        return {
            profiles: []
        };
    }

    async getProfile(handle: string): Promise<Profile> {
        const url = new URL(`.ghost/activitypub/profile/${handle}`, this.apiUrl);
        const json = await this.fetchJSON(url);
        return json as Profile;
    }

    async getFollowersForProfile(handle: string, next?: string): Promise<GetFollowersForProfileResponse> {
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

    async getFollowingForProfile(handle: string, next?: string): Promise<GetFollowingForProfileResponse> {
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

    async getPostsForProfile(handle: string, next?: string): Promise<GetPostsForProfileResponse> {
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

    async getThread(id: string): Promise<ActivityThread> {
        const url = new URL(`.ghost/activitypub/thread/${encodeURIComponent(id)}`, this.apiUrl);
        const json = await this.fetchJSON(url);
        return json as ActivityThread;
    }

    get accountApiUrl() {
        return new URL(`.ghost/activitypub/account/${this.handle}`, this.apiUrl);
    }

    async getAccount(): Promise<GetAccountResponse> {
        const json = await this.fetchJSON(this.accountApiUrl);

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
}

