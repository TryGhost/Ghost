define("ghost/controllers/modals/upload", 
  ["exports"],
  function(__exports__) {
    "use strict";

    var UploadController = Ember.Controller.extend({
        acceptEncoding: 'image/*',
        actions: {
            confirmAccept: function () {
                var self = this;

                this.get('model').save().then(function (model) {
                    self.notifications.showSuccess('保存成功');
                    return model;
                }).catch(function (err) {
                    self.notifications.showErrors(err);
                });
            },

            confirmReject: function () {
                return false;
            }
        }
    });

    __exports__["default"] = UploadController;
  });