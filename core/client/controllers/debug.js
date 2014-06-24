/*global alert, console */

var Debug = Ember.Controller.extend(Ember.Evented, {
    uploadButtonText: 'Import',
    actions: {
        importData: function (file) {
            var self = this;
            this.set('uploadButtonText', 'Importing');
            this.get('model').importFrom(file)
                .then(function (response) {
                    self.notifications.showSuccess(response.message);
                })
                .catch(function (response) {
                    self.notifications.showErrors(response.jqXHR.responseJSON.errors);
                })
                .finally(function () {
                    self.set('uploadButtonText', 'Import');
                    self.trigger('reset');
                });
        },
        sendTestEmail: function () {
            this.get('model').sendTestEmail()
                .then(function (response) {
                    console.log(response);
                    alert('@TODO: success');
                })
                .catch(function (response) {
                    console.log(response);
                    alert('@TODO: error');
                });
        }
    }
});

export default Debug;
