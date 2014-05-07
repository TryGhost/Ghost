import ajax from 'ghost/utils/ajax';
import styleBody from 'ghost/mixins/style-body';
import AuthenticatedRoute from 'ghost/routes/authenticated';
import Post from 'ghost/models/post';
var EditorRoute = AuthenticatedRoute.extend(styleBody, {
    classNames: ['editor'],
    controllerName: 'posts.post',
    model: function (params) {
        return ajax('/ghost/api/v0.1/posts/' + params.post_id).then(function (post) {
            return Post.create(post);
        });
    }
});

export default EditorRoute;
