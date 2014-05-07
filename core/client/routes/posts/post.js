/*global ajax */
import Post from 'ghost/models/post';
var PostsPostRoute = Ember.Route.extend({
    model: function (params) {
        return ajax('/ghost/api/v0.1/posts/' + params.post_id).then(function (post) {
            return Post.create(post);
        });
    }
});

export default PostsPostRoute;
