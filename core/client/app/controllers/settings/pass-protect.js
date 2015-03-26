import Ember from 'ember';

var SettingsPassProtectController = Ember.Controller.extend({

    actions: {
        save: function () {
            var self = this;
            if (this.get('model.isPrivate') && this.get('model.password') === '') {
                self.notifications.closePassive();
                self.notifications.showError('Password must have a value.');
                return;
            }

            return this.get('model').save().then(function (model) {
                self.notifications.closePassive();
                self.notifications.showSuccess('Settings successfully saved.');

                return model;
            }).catch(function (errors) {
                self.notifications.closePassive();
                self.notifications.showErrors(errors);
            });
        }
    }
});

export default SettingsPassProtectController;
