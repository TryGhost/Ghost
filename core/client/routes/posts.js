import styleBody from 'ghost/mixins/style-body';
import ShortcutsRoute from 'ghost/mixins/shortcuts-route';
import loadingIndicator from 'ghost/mixins/loading-indicator';

var paginationSettings = {
    status: 'all',
    staticPages: 'all',
    include: 'tags',
    page: 1
};

var PostsRoute = Ember.Route.extend(Ember.SimpleAuth.AuthenticatedRouteMixin, ShortcutsRoute, styleBody, loadingIndicator, {
    classNames: ['manage'],

    model: function () {
        // using `.filter` allows the template to auto-update when new models are pulled in from the server.
        // we just need to 'return true' to allow all models by default.
        return this.store.filter('post', paginationSettings, function () {
            return true;
        });
    },

    setupController: function (controller, model) {
        this._super(controller, model);
        controller.set('paginationSettings', paginationSettings);
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
            window.alert('@todo keyboard post navigation: up');
        },
        moveDown: function () {
            window.alert('@todo keyboard post navigation: down');
        }
    }
});

export default PostsRoute;
