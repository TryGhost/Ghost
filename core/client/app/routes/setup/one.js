import Ember from 'ember';
import ajax from 'ghost/utils/ajax';

var SetupOneRoute = Ember.Route.extend({
    titleToken: 'Setup',
    beforeModel: function () {
        var self = this,
            ctrl = this.controllerFor('setup.one');

        if (!ctrl) {
            this.generateController('setup.one');
            ctrl = this.controllerFor('setup.one');
        }

        return ajax({
            url: self.get('ghostPaths.count'),
            type: 'GET'
        }).then(function (data) {
            ctrl.set('count', data.count.toLocaleString());
        }).catch(function () { /* Do nothing */ });
    }
});

export default SetupOneRoute;
