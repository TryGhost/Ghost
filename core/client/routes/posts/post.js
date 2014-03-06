import ajax from 'ghost/utils/ajax';

var PostsPostRoute = Ember.Route.extend({
    model: function (params) {
        return ajax("/ghost/api/v0.1/posts/" + params.post_id);
    }
});

export default PostsPostRoute;
