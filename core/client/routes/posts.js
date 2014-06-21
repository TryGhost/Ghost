import AuthenticatedRoute from 'ghost/routes/authenticated';
import styleBody from 'ghost/mixins/style-body';
import ShortcutsRoute from 'ghost/mixins/shortcuts-route';

var paginationSettings = {
    status: 'all',
    staticPages: 'all',
    page: 1
};

var PostsRoute = AuthenticatedRoute.extend(ShortcutsRoute, styleBody, {
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
            this.transitionTo('editor', post);
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
