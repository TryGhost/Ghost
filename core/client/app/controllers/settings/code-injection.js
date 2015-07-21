import Ember from 'ember';

export default Ember.Controller.extend({
    notifications: Ember.inject.service(),

    actions: {
        save: function () {
            var notifications = this.get('notifications');

            return this.get('model').save().then(function (model) {
                return model;
            }).catch(function (error) {
                notifications.showAPIError(error);
            });
        }
    }
});
