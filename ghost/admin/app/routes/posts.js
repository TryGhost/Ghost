import $ from 'jquery';
import AuthenticatedRoute from 'ghost-admin/routes/authenticated';
import InfinityRoute from 'ember-infinity/mixins/route';
import {assign} from '@ember/polyfills';
import {isBlank} from '@ember/utils';

export default AuthenticatedRoute.extend(InfinityRoute, {

    queryParams: {
        type: {
            refreshModel: true,
            replace: true
        },
        author: {
            refreshModel: true,
            replace: true
        },
        tag: {
            refreshModel: true,
            replace: true
        },
        order: {
            refreshModel: true,
            replace: true
        }
    },

    titleToken: 'Content',

    perPage: 30,
    perPageParam: 'limit',
    totalPagesParam: 'meta.pagination.pages',

    _type: null,

    model(params) {
        return this.get('session.user').then((user) => {
            let queryParams = this._typeParams(params.type);
            let filterParams = {tag: params.tag};

            if (params.type === 'featured') {
                filterParams.featured = true;
            }

            if (user.get('isAuthor')) {
                // authors can only view their own posts
                filterParams.author = user.get('slug');
            } else if (params.author) {
                filterParams.author = params.author;
            }

            let filter = this._filterString(filterParams);
            if (!isBlank(filter)) {
                queryParams.filter = filter;
            }

            if (!isBlank(params.order)) {
                queryParams.order = params.order;
            }

            queryParams.formats = 'mobiledoc,plaintext';

            let perPage = this.get('perPage');
            let paginationSettings = assign({perPage, startingPage: 1}, queryParams);

            return this.infinityModel('post', paginationSettings);
        });
    },

    // trigger a background load of all tags and authors for use in the filter dropdowns
    setupController(controller) {
        this._super(...arguments);

        if (!controller._hasLoadedTags) {
            this.get('store').query('tag', {limit: 'all'}).then(() => {
                controller._hasLoadedTags = true;
            });
        }

        this.get('session.user').then((user) => {
            if (!user.get('isAuthor') && !controller._hasLoadedAuthors) {
                this.get('store').query('user', {limit: 'all'}).then(() => {
                    controller._hasLoadedAuthors = true;
                });
            }
        });
    },

    actions: {
        willTransition() {
            if (this.get('controller')) {
                this.resetController();
            }
        },

        queryParamsDidChange() {
            // scroll back to the top
            $('.content-list').scrollTop(0);

            this._super(...arguments);
        }
    },

    _typeParams(type) {
        let status = 'all';
        let staticPages = 'all';

        switch (type) {
        case 'draft':
            status = 'draft';
            staticPages = false;
            break;
        case 'published':
            status = 'published';
            staticPages = false;
            break;
        case 'scheduled':
            status = 'scheduled';
            staticPages = false;
            break;
        case 'page':
            staticPages = true;
            break;
        }

        return {
            status,
            staticPages
        };
    },

    _filterString(filter) {
        return Object.keys(filter).map((key) => {
            let value = filter[key];

            if (!isBlank(value)) {
                return `${key}:${filter[key]}`;
            }
        }).compact().join('+');
    }
});
