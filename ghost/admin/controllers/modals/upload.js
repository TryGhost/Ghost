
var UploadController = Ember.Controller.extend({
    acceptEncoding: 'image/*',
    actions: {
        confirmReject: function () {
            return true;
        }
    },

    confirm: {
        reject: {
            buttonClass: true,
            text: 'Cancel' // The reject button text
        }
    }
});

export default UploadController;
