define("ghost/controllers/settings/code-injection", 
  ["exports"],
  function(__exports__) {
    "use strict";
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

    __exports__["default"] = SettingsCodeInjectionController;
  });