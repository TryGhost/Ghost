import ajax from 'ghost/utils/ajax';
import styleBody from 'ghost/mixins/style-body';
import AuthenticatedRoute from 'ghost/routes/authenticated';
import Post from 'ghost/models/post';

var PostsRoute = AuthenticatedRoute.extend(styleBody, {
    classNames: ['manage'],

    model: function () {
        return ajax('/ghost/api/v0.1/posts').then(function (response) {
            return response.posts.map(function (post) {
                return Post.create(post);
            });
        });
    },

    actions: {
        openEditor: function (post) {
            this.transitionTo('editor', post);
        }
    }
});

export default PostsRoute;
