import styleBody from 'ghost/mixins/style-body';
import AuthenticatedRoute from 'ghost/routes/authenticated';

var PostsRoute = AuthenticatedRoute.extend(styleBody, {
    classNames: ['manage'],

    model: function () {
        return this.store.find('post', { status: 'all', staticPages: 'all' });
    },

    actions: {
        openEditor: function (post) {
            this.transitionTo('editor', post);
        }
    }
});

export default PostsRoute;
