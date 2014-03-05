import ajax from "ghost/utils/ajax";

var PostsRoute = Ember.Route.extend({
    classNames: "manage",

    model: function() {
        return ajax("/ghost/api/v0.1/posts").then(function(response) {
            return response.posts;
        });
    },

    actions: {
        openEditor: function(post) {
            this.transitionTo('editor', post);
        }
    }
});

export default PostsRoute;
