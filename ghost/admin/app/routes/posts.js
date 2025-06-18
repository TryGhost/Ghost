import AdminRoute from 'ghost-admin/routes/admin';
import RSVP from 'rsvp';
import {action} from '@ember/object';
import {assign} from '@ember/polyfills';
import {isBlank} from '@ember/utils';
import {inject as service} from '@ember/service';

export default class PostsRoute extends AdminRoute {
    @service infinity;
    @service router;
    @service session;
    @service feature;
    @service postAnalytics;

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

    model(params) {
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
            models.publishedAndSentInfinityModel = this.infinity.model(this.modelName, assign({perPage, startingPage: 1}, paginationParams, publishedAndSentInfinityModelParams));
        }

        return RSVP.hash(models);
    }

    // trigger a background load of all tags and authors for use in filter dropdowns
    setupController(controller, model) {
        super.setupController(...arguments);

        if (!controller._hasLoadedTags) {
            this.store.query('tag', {limit: 'all'}).then(() => {
                controller._hasLoadedTags = true;
            });
        }

        if (!this.session.user.isAuthorOrContributor && !controller._hasLoadedAuthors) {
            this.store.query('user', {limit: 'all'}).then(() => {
                controller._hasLoadedAuthors = true;
            });
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
     * Fetch Tinybird analytics data for all visible posts
     * @param {Object} model - The posts model containing infinity models
     */
    async _fetchAnalyticsForPosts(model) {
        const postUuids = [];
        if (model.publishedAndSentInfinityModel?.content) {
            postUuids.push(...model.publishedAndSentInfinityModel.content.map(post => post.uuid));
        }
        if (postUuids.length > 0) {
            this.postAnalytics.loadVisitorCounts(postUuids);
        } else {
            // console.log('No published posts found for analytics');
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
