import Ember from 'ember';
var ContentRoute = Ember.Route.extend({
    beforeModel: function () {
        this.transitionTo('posts');
    }
});

export default ContentRoute;
