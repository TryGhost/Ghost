import Ember from 'ember';
var SettingsCodeInjectionController = Ember.Controller.extend({
    actions: {
        save: function () {
            var self = this;

            return this.get('model').save().then(function (model) {
                self.notifications.closePassive();
                self.notifications.showSuccess('配置保存成功。');

                return model;
            }).catch(function (errors) {
                self.notifications.closePassive();
                self.notifications.showErrors(errors);
            });
        }
    }
});

export default SettingsCodeInjectionController;
