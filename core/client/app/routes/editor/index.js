import Ember from 'ember';
var EditorRoute = Ember.Route.extend({
    beforeModel: function () {
        this.transitionTo('editor.new');
    }
});

export default EditorRoute;
