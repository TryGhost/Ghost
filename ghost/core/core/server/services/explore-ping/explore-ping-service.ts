type SettingsCache = {
    get(key: string): unknown;
};

type Config = {
    get(key: string): unknown;
};

type Labs = {
    isSet(flag: string): boolean;
};

type Logging = {
    info(...args: unknown[]): void;
    warn(...args: unknown[]): void;
};

type GhostVersion = {
    full: string;
};

type RequestFn = (url: string, options: Record<string, unknown>) => Promise<{statusCode: number; statusMessage?: string}>;

type PostsService = {
    stats: {
        getMostRecentlyPublishedPostDate(): Promise<Date | null>;
        getFirstPublishedPostDate(): Promise<Date | null>;
        getTotalPostsPublished(): Promise<number | null>;
    };
};

type MembersService = {
    stats: {
        getTotalMembers(): Promise<number>;
    };
};

type MrrByCurrency = {
    currency: string;
    mrr: number;
};

type StatsService = {
    api?: {
        mrr?: {
            getCurrentMrr(): Promise<MrrByCurrency[]>;
        };
    };
} | null;

type ExplorePayload = {
    ghost: string;
    site_uuid: unknown;
    url: unknown;
    theme: unknown;
    facebook: unknown;
    twitter: unknown;
    posts_total?: number | null;
    posts_last?: string | null;
    posts_first?: string | null;
    members_total?: number | null;
    mrr?: MrrByCurrency[] | null;
};

export type ExplorePingServiceDeps = {
    settingsCache: SettingsCache;
    config: Config;
    labs: Labs;
    logging: Logging;
    ghostVersion: GhostVersion;
    request: RequestFn;
    posts: PostsService;
    members: MembersService;
    statsService: StatsService;
};

export class ExplorePingService {
    settingsCache: SettingsCache;
    config: Config;
    labs: Labs;
    logging: Logging;
    ghostVersion: GhostVersion;
    request: RequestFn;
    posts: PostsService;
    members: MembersService;
    statsService: StatsService;

    constructor({settingsCache, config, labs, logging, ghostVersion, request, posts, members, statsService}: ExplorePingServiceDeps) {
        this.settingsCache = settingsCache;
        this.config = config;
        this.labs = labs;
        this.logging = logging;
        this.ghostVersion = ghostVersion;
        this.request = request;
        this.posts = posts;
        this.members = members;
        this.statsService = statsService;
    }

    async constructPayload(): Promise<ExplorePayload> {
        const payload: ExplorePayload = {
            ghost: this.ghostVersion.full,
            site_uuid: this.settingsCache.get('site_uuid'),
            url: this.config.get('url'),
            theme: this.settingsCache.get('active_theme'),
            facebook: this.settingsCache.get('facebook'),
            twitter: this.settingsCache.get('twitter')
        };

        try {
            const [totalPosts, lastPublishedAt, firstPublishedAt] = await Promise.all([
                this.posts.stats.getTotalPostsPublished(),
                this.posts.stats.getMostRecentlyPublishedPostDate(),
                this.posts.stats.getFirstPublishedPostDate()
            ]);

            payload.posts_total = totalPosts;
            payload.posts_last = lastPublishedAt ? lastPublishedAt.toISOString() : null;
            payload.posts_first = firstPublishedAt ? firstPublishedAt.toISOString() : null;
        } catch (err) {
            this.logging.warn('Failed to fetch post statistics', {
                error: (err as Error).message,
                context: 'explore-ping-service'
            });
            payload.posts_total = null;
            payload.posts_last = null;
            payload.posts_first = null;
        }

        if (this.settingsCache.get('explore_ping_growth')) {
            try {
                const totalMembers = await this.members.stats.getTotalMembers();
                payload.members_total = totalMembers;

                // Only send real MRR data when Stripe is in live mode
                // When using test keys (stripe_connect_livemode is false/null), send empty array
                const isStripeLiveMode = this.settingsCache.get('stripe_connect_livemode') === true;
                if (isStripeLiveMode && this.statsService?.api?.mrr) {
                    const mrrByCurrency = await this.statsService.api.mrr.getCurrentMrr();
                    // Return array of {currency, mrr} objects
                    payload.mrr = mrrByCurrency;
                } else {
                    payload.mrr = [];
                }
            } catch (err) {
                this.logging.warn('Failed to fetch member statistics', {
                    error: (err as Error).message,
                    context: 'explore-ping-service'
                });
                payload.members_total = null;
                payload.mrr = null;
            }
        }

        return payload;
    }

    async makeRequest(exploreUrl: string, payload: ExplorePayload | Record<string, unknown>): Promise<{statusCode: number; statusMessage?: string} | undefined> {
        const json = JSON.stringify(payload);
        this.logging.info('Pinging Explore with Payload', exploreUrl, json);

        try {
            const response = await this.request(exploreUrl, {
                method: 'POST',
                body: json,
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            this.logging.info('Explore Response', response.statusCode, response.statusMessage);

            return response;
        } catch (err) {
            this.logging.warn('Explore Error', (err as Error).message);
        }
    }

    async ping(): Promise<void> {
        if (!this.labs.isSet('explore')) {
            return;
        }

        const exploreUrl = this.config.get('explore:update_url') as string | undefined;
        if (!exploreUrl) {
            this.logging.warn('Explore URL not set');
            return;
        }

        if (!this.settingsCache.get('explore_ping')) {
            this.logging.info('Explore ping disabled');
            return;
        }

        const payload = await this.constructPayload();
        await this.makeRequest(exploreUrl, payload);
    }
}
