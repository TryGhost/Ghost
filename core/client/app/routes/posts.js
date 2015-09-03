import Ember from 'ember';
import AuthenticatedRoute from 'ghost/routes/authenticated';
import ShortcutsRoute from 'ghost/mixins/shortcuts-route';
import PaginationRouteMixin from 'ghost/mixins/pagination-route';

var paginationSettings = {
    status: 'all',
    staticPages: 'all',
    page: 1
};

export default AuthenticatedRoute.extend(ShortcutsRoute, PaginationRouteMixin, {
    titleToken: 'Content',

    model: function () {
        var self = this;

        return this.get('session.user').then(function (user) {
            if (user.get('isAuthor')) {
                paginationSettings.author = user.get('slug');
            }

            // using `.filter` allows the template to auto-update when new models are pulled in from the server.
            // we just need to 'return true' to allow all models by default.
            return self.store.filter('post', paginationSettings, function (post) {
                if (user.get('isAuthor')) {
                    return post.isAuthoredByUser(user);
                }

                return true;
            });
        });
    },

    setupController: function (controller, model) {
        this._super(controller, model);
        this.setupPagination(paginationSettings);
    },

    stepThroughPosts: function (step) {
        var currentPost = this.get('controller.currentPost'),
            posts = this.get('controller.sortedPosts'),
            length = posts.get('length'),
            newPosition;

        newPosition = posts.indexOf(currentPost) + step;

        // if we are on the first or last item
        // just do nothing (desired behavior is to not
        // loop around)
        if (newPosition >= length) {
            return;
        } else if (newPosition < 0) {
            return;
        }

        this.transitionTo('posts.post', posts.objectAt(newPosition));
    },

    scrollContent: function (amount) {
        var content = Ember.$('.js-content-preview'),
            scrolled = content.scrollTop();

        content.scrollTop(scrolled + 50 * amount);
    },

    shortcuts: {
        'up, k': 'moveUp',
        'down, j': 'moveDown',
        left: 'focusList',
        right: 'focusContent',
        c: 'newPost'
    },

    actions: {
        focusList: function () {
            this.controller.set('keyboardFocus', 'postList');
        },
        focusContent: function () {
            this.controller.set('keyboardFocus', 'postContent');
        },
        newPost: function () {
            this.transitionTo('editor.new');
        },

        moveUp: function () {
            if (this.controller.get('postContentFocused')) {
                this.scrollContent(-1);
            } else {
                this.stepThroughPosts(-1);
            }
        },

        moveDown: function () {
            if (this.controller.get('postContentFocused')) {
                this.scrollContent(1);
            } else {
                this.stepThroughPosts(1);
            }
        }
    }
});
