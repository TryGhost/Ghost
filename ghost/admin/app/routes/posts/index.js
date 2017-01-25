import AuthenticatedRoute from 'ghost-admin/routes/authenticated';
import ShortcutsRoute from 'ghost-admin/mixins/shortcuts-route';
import InfinityRoute from 'ember-infinity/mixins/route';
import computed from 'ember-computed';
import {assign} from 'ember-platform';
import $ from 'jquery';

export default AuthenticatedRoute.extend(InfinityRoute, ShortcutsRoute, {

    perPageParam: 'limit',
    totalPagesParam: 'meta.pagination.pages',

    _type: null,

    model(params) {
        this.set('_type', params.type);
        let filterSettings = this.get('filterSettings');

        return this.get('session.user').then((user) => {
            if (user.get('isAuthor')) {
                filterSettings.filter = filterSettings.filter
                    ? `${filterSettings.filter}+author:${user.get('slug')}` : `author:${user.get('slug')}`;
            }

            let paginationSettings = assign({perPage: 15, startingPage: 1}, filterSettings);

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
        let currentPost = this.get('controller.currentPost');
        let posts = this.get('controller.sortedPosts');
        let length = posts.get('length');
        let newPosition = posts.indexOf(currentPost) + step;

        // if we are on the first or last item
        // just do nothing (desired behavior is to not
        // loop around)
        if (newPosition >= length) {
            return;
        } else if (newPosition < 0) {
            return;
        }

        // TODO: highlight post
        // this.transitionTo('posts.post', posts.objectAt(newPosition));
    },

    shortcuts: {
        'up, k': 'moveUp',
        'down, j': 'moveDown',
        c: 'newPost'
    },

    actions: {
        queryParamsDidChange() {
            this.refresh();
            // reset the scroll position
            $('.content-list-content').scrollTop(0);
        },

        newPost() {
            this.transitionTo('editor.new');
        },

        moveUp() {
            this.stepThroughPosts(-1);
        },

        moveDown() {
            this.stepThroughPosts(1);
        }
    }
});
