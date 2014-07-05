var DebugController = Ember.Controller.extend(Ember.Evented, {
    uploadButtonText: 'Import',

    exportPath: function () {
        return this.get('ghostPaths').apiUrl('db') +
            '?access_token=' + this.get('session.access_token');
    }.property(),

    actions: {
        onUpload: function (file) {
            var self = this,
                formData = new FormData();

            this.set('uploadButtonText', 'Importing');

            formData.append('importfile', file);

            ic.ajax.request(this.get('ghostPaths').apiUrl('db'), {
                type: 'POST',
                data: formData,
                dataType: 'json',
                cache: false,
                contentType: false,
                processData: false
            }).then(function () {
                self.notifications.showSuccess('Import successful.');
            }).catch(function (response) {
                self.notifications.showAPIError(response);
            }).finally(function () {
                self.set('uploadButtonText', 'Import');
                self.trigger('reset');
            });
        },

        exportData: function () {
            var self = this;

            ic.ajax.request(this.get('ghostPaths').apiUrl('db'), {
                type: 'GET'
            }).then(function () {
                self.notifications.showSuccess('Data exported successfully.');
            }).catch(function (response) {
                self.notifications.showErrors(response);
            });
        },

        sendTestEmail: function () {
            var self = this;

            ic.ajax.request(this.get('ghostPaths').apiUrl('mail', 'test'), {
                type: 'POST'
            }).then(function () {
                self.notifications.showSuccess('Check your email for the test message:');
            }).catch(function (response) {
                self.notifications.showErrors(response);
            });
        }
    }
});

export default DebugController;
