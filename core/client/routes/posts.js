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
    queryParams: {
        status: {
            refreshModel: true
        },
        featured: {
            refreshModel: true
        },
        staticPages: {
            refreshModel: true
        }
    },

    model: function (params) {
        var self = this;

        return this.store.find('user', 'me').then(function (user) {
            if (user.get('isAuthor')) {
                paginationSettings.author = user.get('slug');
            }
            // using `.filter` allows the template to auto-update when new models are pulled in from the server.
            // we just need to 'return true' to allow all models by default.
            return self.store.filter('post', _.extend({}, paginationSettings, params), function (post) {
                if (user.get('isAuthor')) {
                    return post.isAuthoredByUser(user);
                }

                return true;
            });
        });
    },

    setupController: function (controller, model) {
        var queryParams;

        this._super(controller, model);

        queryParams = {
            'status': controller.get('status'),
            'featured': controller.get('featured'),
            'staticPages': controller.get('staticPages')
        };

        if (queryParams.status === 'published') {
            controller.set('filter', 'published');
        } else if (queryParams.status === 'draft') {
            controller.set('filter', 'draft');
        } else if (queryParams.featured === 'true') {
            controller.set('filter', 'featured');
        } else if (queryParams.staticPages === 'true') {
            controller.set('filter', 'pages');
        }

        this.setupPagination(paginationSettings);
    },

    stepThroughPosts: function (step) {
        var currentPost = this.get('controller.currentPost'),
            posts = this.get('controller.arrangedContent'),
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

    shortcuts: {
        'up': 'moveUp',
        'down': 'moveDown'
    },
    actions: {
        moveUp: function () {
            this.stepThroughPosts(-1);
        },
        moveDown: function () {
            this.stepThroughPosts(1);
        },
        filterPosts: function (filterName) {
            this.controller.setFilter(filterName);
        }
    }
});

export default PostsRoute;
