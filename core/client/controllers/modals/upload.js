
var UploadController = Ember.Controller.extend({
    acceptEncoding: 'image/*',
    actions: {
        confirmAccept: function () {
            var self = this;

            this.get('model').save().then(function (model) {
                self.notifications.showSuccess('Saved');
                return model;
            }).catch(this.notifications.showErrors);
        },

        confirmReject: function () {
            return false;
        }
    }
});

export default UploadController;
