const ghostVersion = require('@tryghost/version');

module.exports = class ExploreService {
    /**
     * @param {Object} options
     * @param {Object} options.MembersService
     * @param {Object} options.PostsService
     * @param {Object} options.PublicConfigService
     * @param {Object} options.StatsService
     * @param {Object} options.StripeService
     * @param {Object} options.UserModel
     */
    constructor({MembersService, PostsService, PublicConfigService, StatsService, StripeService, UserModel}) {
        this.MembersService = MembersService;
        this.PostsService = PostsService;
        this.PublicConfigService = PublicConfigService;
        this.StatsService = StatsService;
        this.StripeService = StripeService;
        this.UserModel = UserModel;
    }

    /**
     * Build and return the response object containing the data for the Ghost Explore endpoint
     */
    async fetchData() {
        const totalMembers = await this.MembersService.stats.getTotalMembers();
        const mrrStats = await this.StatsService.getMRRHistory();

        const {description, icon, title, url, accent_color: accentColor, locale} = this.PublicConfigService.site;

        const exploreProperties = {
            version: ghostVersion.full,
            total_members: totalMembers,
            mrr_stats: mrrStats,
            site: {
                description,
                icon,
                title,
                url,
                accent_color: accentColor,
                locale
            },
            stripe: {
                configured: this.StripeService.api.configured,
                livemode: (this.StripeService.api.configured && this.StripeService.api.mode === 'live')
            }
        };

        const mostRecentlyPublishedPost = await this.PostsService.stats.getMostRecentlyPublishedPostDate();
        const totalPostsPublished = await this.PostsService.stats.getTotalPostsPublished();
        exploreProperties.most_recently_published_at = mostRecentlyPublishedPost ?? null;
        exploreProperties.total_posts_published = totalPostsPublished ?? null;

        const owner = await this.UserModel.findOne({role: 'Owner', status: 'all'});
        exploreProperties.owner_email = owner?.get('email') ?? null;

        return exploreProperties;
    }
};
