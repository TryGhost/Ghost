import Ember from 'ember';
var SettingsConnectionsController = Ember.Controller.extend({

    // Just an example image to show off the template correctly
    connectionImage: Ember.computed(function () {
        return this.get('ghostPaths.url').asset('/shared/img/user-image.png');
    })
});

export default SettingsConnectionsController;
