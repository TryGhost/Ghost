var ContentRoute = Ember.Route.extend({
    beforeModel: function () {
        this.transitionTo('posts');
    }
});

export default ContentRoute;