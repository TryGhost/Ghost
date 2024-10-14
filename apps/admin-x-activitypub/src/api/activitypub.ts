// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Actor = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Activity = any;

export interface Profile {
    actor: Actor;
    handle: string;
    followerCount: number;
    isFollowing: boolean;
    posts: Activity[];
}

export interface SearchResults {
    profiles: Profile[];
}

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

    get followingApiUrl() {
        return new URL(`.ghost/activitypub/following/${this.handle}`, this.apiUrl);
    }

    async getFollowing(): Promise<Activity[]> {
        const json = await this.fetchJSON(this.followingApiUrl);
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

    async getFollowingCount(): Promise<number> {
        const json = await this.fetchJSON(this.followingApiUrl);
        if (json === null) {
            return 0;
        }
        if ('totalItems' in json && typeof json.totalItems === 'number') {
            return json.totalItems;
        }
        return 0;
    }

    get followersApiUrl() {
        return new URL(`.ghost/activitypub/followers/${this.handle}`, this.apiUrl);
    }

    async getFollowers(): Promise<Activity[]> {
        const json = await this.fetchJSON(this.followersApiUrl);
        if (json === null) {
            return [];
        }
        if ('orderedItems' in json) {
            return Array.isArray(json.orderedItems) ? json.orderedItems : [json.orderedItems];
        }
        return [];
    }

    async getFollowersCount(): Promise<number> {
        const json = await this.fetchJSON(this.followersApiUrl);
        if (json === null) {
            return 0;
        }
        if ('totalItems' in json && typeof json.totalItems === 'number') {
            return json.totalItems;
        }
        return 0;
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

    async follow(username: string): Promise<void> {
        const url = new URL(`.ghost/activitypub/actions/follow/${username}`, this.apiUrl);
        await this.fetchJSON(url, 'POST');
    }

    async getActor(url: string): Promise<Actor> {
        const json = await this.fetchJSON(new URL(url));
        return json as Actor;
    }

    get likedApiUrl() {
        return new URL(`.ghost/activitypub/liked/${this.handle}`, this.apiUrl);
    }

    async getLiked() {
        const json = await this.fetchJSON(this.likedApiUrl);
        if (json === null) {
            return [];
        }
        if ('orderedItems' in json) {
            return Array.isArray(json.orderedItems) ? json.orderedItems : [json.orderedItems];
        }
        return [];
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
        cursor?: string
    ): Promise<{data: Activity[], nextCursor: string | null}> {
        const LIMIT = 50;

        const url = new URL(this.activitiesApiUrl);
        url.searchParams.set('limit', LIMIT.toString());
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
                nextCursor: null
            };
        }

        if (!('items' in json)) {
            return {
                data: [],
                nextCursor: null
            };
        }

        const data = Array.isArray(json.items) ? json.items : [];
        const nextCursor = 'nextCursor' in json && typeof json.nextCursor === 'string' ? json.nextCursor : null;

        return {
            data,
            nextCursor
        };
    }

    async getAllActivities(
        includeOwn: boolean = false,
        includeReplies: boolean = false,
        filter: {type?: string[]} | null = null
    ): Promise<Activity[]> {
        const LIMIT = 50;

        const fetchActivities = async (url: URL): Promise<Activity[]> => {
            const json = await this.fetchJSON(url);

            // If the response is null, return early
            if (json === null) {
                return [];
            }

            // If the response doesn't have an items array, return early
            if (!('items' in json)) {
                return [];
            }

            // If the response has an items property, but it's not an array
            // use an empty array
            const items = Array.isArray(json.items) ? json.items : [];

            // If the response has a nextCursor property, fetch the next page
            // recursively and concatenate the results
            if ('nextCursor' in json && typeof json.nextCursor === 'string') {
                const nextUrl = new URL(url);

                nextUrl.searchParams.set('cursor', json.nextCursor);
                nextUrl.searchParams.set('limit', LIMIT.toString());
                if (includeOwn) {
                    nextUrl.searchParams.set('includeOwn', includeOwn.toString());
                }
                if (includeReplies) {
                    nextUrl.searchParams.set('includeReplies', includeReplies.toString());
                }
                if (filter) {
                    nextUrl.searchParams.set('filter', JSON.stringify(filter));
                }

                const nextItems = await fetchActivities(nextUrl);

                return items.concat(nextItems);
            }

            return items;
        };

        // Make a copy of the activities API URL and set the limit
        const url = new URL(this.activitiesApiUrl);
        url.searchParams.set('limit', LIMIT.toString());
        if (includeOwn) {
            url.searchParams.set('includeOwn', includeOwn.toString());
        }
        if (includeReplies) {
            url.searchParams.set('includeReplies', includeReplies.toString());
        }
        if (filter) {
            url.searchParams.set('filter', JSON.stringify(filter));
        }

        // Fetch the activities
        return fetchActivities(url);
    }

    async reply(id: string, content: string) {
        const url = new URL(`.ghost/activitypub/actions/reply/${encodeURIComponent(id)}`, this.apiUrl);
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
}
