import styleBody from 'ghost/mixins/style-body';
import AuthenticatedRoute from 'ghost/routes/authenticated';

var paginationSettings = {
    status: 'all',
    staticPages: 'all',
    page: 1,
    limit: 15
};

var PostsRoute = AuthenticatedRoute.extend(styleBody, {
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

    actions: {
        openEditor: function (post) {
            this.transitionTo('editor', post);
        }
    }
});

export default PostsRoute;
