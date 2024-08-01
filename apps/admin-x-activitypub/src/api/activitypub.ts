// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Actor = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Activity = any;

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

    private async fetchJSON(url: URL, method: 'GET' | 'POST' = 'GET'): Promise<object | null> {
        const token = await this.getToken();
        const response = await this.fetch(url, {
            method,
            headers: {
                Authorization: `Bearer ${token}`,
                Accept: 'application/activity+json'
            }
        });
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
        if ('items' in json) {
            return Array.isArray(json.items) ? json.items : [json.items];
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

    async follow(username: string): Promise<void> {
        const url = new URL(`.ghost/activitypub/actions/follow/${username}`, this.apiUrl);
        await this.fetchJSON(url, 'POST');
    }
}
