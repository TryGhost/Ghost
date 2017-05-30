import $ from 'jquery';
import AuthenticatedRoute from 'ghost-admin/routes/authenticated';
import InfinityRoute from 'ember-infinity/mixins/route';
import ShortcutsRoute from 'ghost-admin/mixins/shortcuts-route';
import {assign} from 'ember-platform';
import {isBlank} from 'ember-utils';

export default AuthenticatedRoute.extend(InfinityRoute, ShortcutsRoute, {
    titleToken: 'Content',

    perPage: 30,
    perPageParam: 'limit',
    totalPagesParam: 'meta.pagination.pages',

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

    _type: null,
    _selectedPostIndex: null,

    model(params) {
        return this.get('session.user').then((user) => {
            let queryParams = this._typeParams(params.type);
            let filterParams = {tag: params.tag};

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

    stepThroughPosts(step) {
        let currentPost = this.get('controller.selectedPost');
        let posts = this.get('controller.model');
        let length = posts.get('length');
        let newPosition;

        // when the currentPost is deleted we won't be able to use indexOf.
        // we keep track of the index locally so we can select next after deletion
        if (this._selectedPostIndex !== null && length) {
            newPosition = this._selectedPostIndex + step;
        } else {
            newPosition = posts.indexOf(currentPost) + step;
        }

        // if we are on the first or last item
        // just do nothing (desired behavior is to not
        // loop around)
        if (newPosition >= length) {
            return;
        } else if (newPosition < 0) {
            return;
        }

        this._selectedPostIndex = newPosition;
        this.set('controller.selectedPost', posts.objectAt(newPosition));
    },

    shortcuts: {
        'up, k': 'moveUp',
        'down, j': 'moveDown',
        'enter': 'editPost',
        'c': 'newPost',
        'command+backspace, ctrl+backspace': 'deletePost'
    },

    resetController() {
        this.set('controller.selectedPost', null);
        this.set('controller.showDeletePostModal', false);
    },

    actions: {
        willTransition() {
            this._selectedPostIndex = null;

            if (this.get('controller')) {
                this.resetController();
            }
        },

        queryParamsDidChange() {
            // scroll back to the top
            $('.content-list').scrollTop(0);

            this._super(...arguments);
        },

        newPost() {
            this.transitionTo('editor.new');
        },

        moveUp() {
            this.stepThroughPosts(-1);
        },

        moveDown() {
            this.stepThroughPosts(1);
        },

        editPost() {
            let selectedPost = this.get('controller.selectedPost');

            if (selectedPost) {
                this.transitionTo('editor.edit', selectedPost.get('id'));
            }
        },

        deletePost() {
            this.get('controller').send('toggleDeletePostModal');
        },

        onPostDeletion() {
            // select next post (re-select the current index)
            this.stepThroughPosts(0);
        }
    }
});
