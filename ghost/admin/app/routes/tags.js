import AuthenticatedRoute from 'ghost-admin/routes/authenticated';
import {inject as service} from '@ember/service';

const CACHE_TIME = 1000 * 60 * 5; // 5 minutes

export default class TagsRoute extends AuthenticatedRoute {
    @service infinity;
    @service tagsManager;

    queryParams = {
        type: {
            refreshModel: true,
            replace: true
        }
    };

    // authors aren't allowed to manage tags
    beforeModel() {
        super.beforeModel(...arguments);

        if (this.session.user.isAuthorOrContributor) {
            return this.transitionTo('home');
        }
    }

    model(params) {
        const filterParams = {
            visibility: params.type
        };

        const paginationParams = {
            perPage: 100,
            perPageParam: 'limit',
            totalPagesParam: 'meta.pagination.pages',
            order: 'name asc',
            include: 'count.posts'
        };

        this.tagsManager.tagsScreenInfinityModel = this.infinity.model('tag', {
            ...paginationParams,
            filter: this._filterString({...filterParams}),
            infinityCache: CACHE_TIME
        });

        return this.tagsManager.tagsScreenInfinityModel;
    }

    buildRouteInfoMetadata() {
        return {
            titleToken: 'Tags'
        };
    }

    _filterString(filter) {
        return Object.entries(filter).map(([key, value]) => {
            return `${key}:${value}`;
        }).join(',');
    }
}
