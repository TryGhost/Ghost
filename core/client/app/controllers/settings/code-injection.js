import Ember from 'ember';

export default Ember.Controller.extend({
    actions: {
        save: function () {
            var notifications = this.get('notifications');

            return this.get('model').save().then(function (model) {
                notifications.closePassive();
                notifications.showSuccess('Settings successfully saved.');

                return model;
            }).catch(function (errors) {
                notifications.closePassive();
                notifications.showErrors(errors);
            });
        }
    }
});
