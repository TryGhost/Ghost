import styleBody from 'ghost/mixins/style-body';
import ShortcutsRoute from 'ghost/mixins/shortcuts-route';
import loadingIndicator from 'ghost/mixins/loading-indicator';
import PaginationRouteMixin from 'ghost/mixins/pagination-route';

var paginationSettings = {
    status: 'all',
    staticPages: 'all',
    page: 1
};

var PostsRoute = Ember.Route.extend(SimpleAuth.AuthenticatedRouteMixin, ShortcutsRoute, styleBody, loadingIndicator, PaginationRouteMixin, {
    classNames: ['manage'],

    model: function () {
        var self = this;

        return this.store.find('user', 'me').then(function (user) {
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
            posts = this.get('controller.model'),
            length = posts.get('length'),
            newPosition;

        newPosition = posts.indexOf(currentPost) + step;

        //Make sure we're inbounds
        if (newPosition >= length) {
            newPosition = 0;
        }
        else if (newPosition < 0) {
            newPosition = length - 1;
        }
        this.transitionTo('posts.post', posts.objectAt(newPosition));
    },

    shortcuts: {
        'up': 'moveUp',
        'down': 'moveDown'
    },
    actions: {
        openEditor: function (post) {
            this.transitionTo('editor.edit', post);
        },
        moveUp: function () {
            this.stepThroughPosts(-1);
        },
        moveDown: function () {
            this.stepThroughPosts(1);
        }
    }
});

export default PostsRoute;
