
var UploadController = Ember.Controller.extend({
    confirm: {
        reject: {
            func: function () { // The function called on rejection
                return true;
            },
            buttonClass: true,
            text: "Cancel" // The reject button text
        }
    }
});

export default UploadController;