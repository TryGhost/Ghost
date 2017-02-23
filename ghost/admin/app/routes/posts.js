import AuthenticatedRoute from 'ghost-admin/routes/authenticated';
import ShortcutsRoute from 'ghost-admin/mixins/shortcuts-route';
import InfinityRoute from 'ember-infinity/mixins/route';
import computed from 'ember-computed';
import {assign} from 'ember-platform';
import $ from 'jquery';

export default AuthenticatedRoute.extend(InfinityRoute, ShortcutsRoute, {
    titleToken: 'Content',

    perPage: 30,
    perPageParam: 'limit',
    totalPagesParam: 'meta.pagination.pages',

    _type: null,
    _selectedPostIndex: null,

    model(params) {
        this.set('_type', params.type);
        let filterSettings = this.get('filterSettings');

        return this.get('session.user').then((user) => {
            if (user.get('isAuthor')) {
                filterSettings.filter = filterSettings.filter
                    ? `${filterSettings.filter}+author:${user.get('slug')}` : `author:${user.get('slug')}`;
            }

            let perPage = this.get('perPage');
            let paginationSettings = assign({perPage, startingPage: 1}, filterSettings);

            return this.infinityModel('post', paginationSettings);
        });
    },

    filterSettings: computed('_type', function () {
        let type = this.get('_type');
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
    }),

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
            // on direct page load controller won't exist so we want to
            // avoid a double transition
            if (this.get('controller')) {
                this.refresh();
            }

            // scroll back to the top
            $('.content-list').scrollTop(0);
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
