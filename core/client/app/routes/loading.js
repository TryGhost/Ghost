import Ember from 'ember';

export default Ember.Route.extend({
    renderTemplate: function () {
        Ember.run.later(this, function () {
            this.render();
        }, 250);
    }
});
