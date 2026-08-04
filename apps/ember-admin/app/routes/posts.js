import AuthenticatedRoute from 'ghost-admin/routes/authenticated';
import InfinityModel from 'ember-infinity/lib/infinity-model';
import RSVP from 'rsvp';
import classic from 'ember-classic-decorator';
import {action} from '@ember/object';
import {assign} from '@ember/polyfills';
import {isBlank} from '@ember/utils';
import {inject as service} from '@ember/service';

@classic
class PostsWithAnalytics extends InfinityModel {
    @service postAnalytics;
    @service feature;
    @service settings;

    afterInfinityModel(posts) {
        const publishedPosts = posts.filter(post => ['published', 'sent'].includes(post.status));
        if (publishedPosts.length === 0) {
            return posts;
        }

        // Analytics loads are deliberately not awaited so a slow or
        // unavailable analytics service can't block rendering the list -
        // counts fill in reactively when the requests complete
        if (this.settings.webAnalyticsEnabled) {
            const postUuids = publishedPosts.map(post => post.uuid);
            this.postAnalytics.loadVisitorCounts(postUuids);
        }

        if (this.settings.membersTrackSources) {
            this.postAnalytics.loadMemberCounts(publishedPosts);
        }

        return posts;
    }
}

export default class PostsRoute extends AuthenticatedRoute {
    @service infinity;
    @service router;
    @service feature;
    @service postAnalytics;
    @service settings;
    @service ui;

    queryParams = {
        type: {refreshModel: true},
        visibility: {refreshModel: true},
        author: {refreshModel: true},
        tag: {refreshModel: true},
        order: {refreshModel: true}
    };

    modelName = 'post';
    perPage = 30;

    constructor() {
        super(...arguments);

        // if we're already on this route and we're transiting _to_ this route
        // then the filters are being changed and we shouldn't create a new
        // browser history entry
        // see https://github.com/TryGhost/Ghost/issues/11057
        this.router.on('routeWillChange', (transition) => {
            if (transition.to && (this.routeName === 'posts' || this.routeName === 'pages')) {
                let toThisRoute = transition.to.find(route => route.name === this.routeName);
                if (transition.from && transition.from.name === this.routeName && toThisRoute) {
                    transition.method('replace');
                }
            }
        });
    }

    // React owns /posts and /pages when the flag is on. Aborting keeps the
    // Ember subtree unrendered, so `data-testid` attributes exist in only one
    // tree and none of the three infinity models below fire for a screen
    // nobody sees. Inherited by PagesRoute, so this covers both URLs.
    beforeModel(transition) {
        super.beforeModel(...arguments);

        if (!this.feature.postsListReact) {
            return;
        }

        transition.abort();

        // Aborting means the route we came FROM never deactivates, so any UI
        // state its teardown would have cleared stays set. The editor's
        // `deactivate` clears full-screen mode, and the React shell reads that
        // to decide whether to show the sidebar - so without this, returning
        // from the editor leaves you looking at a sidebar-less screen.
        this.ui.set('isFullScreen', false);

        // Ember and React share window.location.hash, and an aborted
        // transition never reaches updateURL - so a navigation Ember itself
        // started would be a silent no-op without writing the URL ourselves.
        //
        // The transition intent says which case we're in. A URL intent (cold
        // load, hash change, React-driven navigation) already has the browser
        // URL pointing here, so React renders and there is nothing to do -
        // and leaving it alone is what keeps query params like ?type=draft,
        // which is how saved views are addressed, intact. A named intent
        // (`transitionTo('posts')` from the publish flow, or a
        // `<LinkTo @route="posts">` breadcrumb) has no URL yet, so we supply
        // one.
        if (!transition.intent?.url) {
            this._navigateToReactRoute(this._reactRouteUrl(transition));
        }
    }

    // Built by hand rather than with `router.urlFor`, whose output depends on
    // the configured location - it returns `/ghost/posts` under the `none`
    // location used in tests but `#/posts/` under `trailing-hash` in the app.
    // These routes have no dynamic segments, so the path is just the name.
    _reactRouteUrl(transition) {
        const queryParams = transition.to?.queryParams ?? {};
        const search = Object.entries(queryParams)
            .filter(([, value]) => value !== null && value !== undefined && value !== '')
            .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
            .join('&');

        return search ? `/${this.routeName}?${search}` : `/${this.routeName}`;
    }

    // Seam so tests can assert the navigation without a real hash location -
    // Ember acceptance tests run with `location: 'none'`.
    _navigateToReactRoute(url) {
        window.location.hash = url;
    }

    model(params) {
        // Reset analytics cache every time we load the posts index to ensure fresh data
        if (this.settings.webAnalyticsEnabled || this.settings.membersTrackSources) {
            this.postAnalytics.reset();
        }

        const user = this.session.user;
        let filterParams = {tag: params.tag, visibility: params.visibility};
        let paginationParams = {
            perPageParam: 'limit',
            totalPagesParam: 'meta.pagination.pages'
        };

        // type filters are actually mapping statuses
        assign(filterParams, this._getTypeFilters(params.type));

        if (params.type === 'featured') {
            filterParams.featured = true;
        }

        // authors and contributors can only view their own posts
        if (user.isAuthor) {
            filterParams.authors = user.slug;
        } else if (user.isContributor) {
            filterParams.authors = user.slug;
            // otherwise we need to filter by author if present
        } else if (params.author) {
            filterParams.authors = params.author;
        }

        let perPage = this.perPage;

        const filterStatuses = filterParams.status;
        let queryParams = {allFilter: this._filterString({...filterParams})}; // pass along the parent filter so it's easier to apply the params filter to each infinity model
        let models = {};

        if (filterStatuses.includes('scheduled')) {
            let scheduledInfinityModelParams = {...queryParams, order: params.order || 'published_at desc', filter: this._filterString({...filterParams, status: 'scheduled'})};
            models.scheduledInfinityModel = this.infinity.model(this.modelName, assign({perPage, startingPage: 1}, paginationParams, scheduledInfinityModelParams));
        }
        if (filterStatuses.includes('draft')) {
            let draftInfinityModelParams = {...queryParams, order: params.order || 'updated_at desc', filter: this._filterString({...filterParams, status: 'draft'})};
            models.draftInfinityModel = this.infinity.model(this.modelName, assign({perPage, startingPage: 1}, paginationParams, draftInfinityModelParams));
        }
        if (filterStatuses.includes('published') || filterStatuses.includes('sent')) {
            let publishedAndSentInfinityModelParams;
            if (filterStatuses.includes('published') && filterStatuses.includes('sent')) {
                publishedAndSentInfinityModelParams = {...queryParams, order: params.order || 'published_at desc', filter: this._filterString({...filterParams, status: '[published,sent]'})};
            } else {
                publishedAndSentInfinityModelParams = {...queryParams, order: params.order || 'published_at desc', filter: this._filterString({...filterParams, status: filterStatuses.includes('published') ? 'published' : 'sent'})};
            }
            models.publishedAndSentInfinityModel = this.infinity.model(this.modelName, assign({perPage, startingPage: 1}, paginationParams, publishedAndSentInfinityModelParams), PostsWithAnalytics);
        }

        return RSVP.hash(models);
    }

    // trigger a background load of any filtered tag/author that isn't already
    // in the store so the filter dropdown triggers can display their names
    setupController(controller, model) {
        super.setupController(...arguments);

        if (!this.session.user.isAuthorOrContributor && controller.selectedAuthor?.slug === '!unknown') {
            this.store.queryRecord('user', {slug: controller.author});
        }

        if (controller.tag && !controller.selectedTag?.slug || controller.selectedTag?.slug === '!unknown') {
            this.store.queryRecord('tag', {slug: controller.tag});
        }

        if (controller.selectionList) {
            if (this.session.user.isAuthorOrContributor) {
                controller.selectionList.enabled = false;
            }
            controller.selectionList.infinityModel = model;
            controller.selectionList.clearSelection();
        }

        // Fetch analytics data for visible posts
        this._fetchAnalyticsForPosts(model);
    }

    /**
     * Fetch analytics data for all visible posts
     * @param {Object} model - The posts model containing infinity models
     */
    async _fetchAnalyticsForPosts(model) {
        // Early return if neither analytics feature is enabled
        if (!this.settings.webAnalyticsEnabled && !this.settings.membersTrackSources) {
            return;
        }

        const posts = [];
        if (model.publishedAndSentInfinityModel?.content) {
            posts.push(...model.publishedAndSentInfinityModel.content);
        }
        
        if (posts.length === 0) {
            return;
        }

        const promises = [];
        
        // Fetch visitor counts if web analytics is enabled
        if (this.settings.webAnalyticsEnabled) {
            const postUuids = posts.map(post => post.uuid);
            promises.push(this.postAnalytics.loadVisitorCounts(postUuids));
        }
        
        // Fetch member counts if member tracking is enabled
        if (this.settings.membersTrackSources) {
            promises.push(this.postAnalytics.loadMemberCounts(posts));
        }

        if (promises.length > 0) {
            await Promise.all(promises);
        }
    }

    @action
    queryParamsDidChange() {
        // scroll back to the top
        let contentList = document.querySelector('.content-list');
        if (contentList) {
            contentList.scrollTop = 0;
        }

        super.actions.queryParamsDidChange.call(this, ...arguments);
    }

    buildRouteInfoMetadata() {
        return {
            titleToken: 'Posts'
        };
    }

    /**
     * Returns an object containing the status filter based on the given type.
     *
     * @param {string} type - The type of filter to generate (draft, published, scheduled, sent).
     * @returns {Object} - An object containing the status filter.
     */
    _getTypeFilters(type) {
        let status = '[draft,scheduled,published,sent]';

        switch (type) {
        case 'draft':
            status = 'draft';
            break;
        case 'published':
            status = 'published';
            break;
        case 'scheduled':
            status = 'scheduled';
            break;
        case 'sent':
            status = 'sent';
            break;
        }

        return {
            status
        };
    }

    _filterString(filter) {
        return Object.keys(filter).map((key) => {
            let value = filter[key];

            if (!isBlank(value)) {
                return `${key}:${filter[key]}`;
            }

            return undefined;
        }).compact().join('+');
    }
}
