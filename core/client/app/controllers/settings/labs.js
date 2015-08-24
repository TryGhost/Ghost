import Ember from 'ember';
import {request as ajax} from 'ic-ajax';

export default Ember.Controller.extend({
    uploadButtonText: 'Import',
    importErrors: '',
    submitting: false,

    ghostPaths: Ember.inject.service('ghost-paths'),
    notifications: Ember.inject.service(),

    labsJSON: Ember.computed('model.labs', function () {
        return JSON.parse(this.get('model.labs') || {});
    }),

    saveLabs: function (optionName, optionValue) {
        var self = this,
            labsJSON =  this.get('labsJSON');

        // Set new value in the JSON object
        labsJSON[optionName] = optionValue;

        this.set('model.labs', JSON.stringify(labsJSON));

        this.get('model').save().catch(function (errors) {
            self.showErrors(errors);
            self.get('model').rollback();
        });
    },

    actions: {
        onUpload: function (file) {
            var self = this,
                formData = new FormData(),
                notifications = this.get('notifications');

            this.set('uploadButtonText', 'Importing');
            this.set('importErrors', '');
            notifications.closeNotifications();

            formData.append('importfile', file);

            ajax(this.get('ghostPaths.url').api('db'), {
                type: 'POST',
                data: formData,
                dataType: 'json',
                cache: false,
                contentType: false,
                processData: false
            }).then(function () {
                // TODO: keep as notification, add link to view content
                // notifications.showNotification('Import successful.');
                // We have to reload the page to fix various intermittent bugs e.g. no author options in PSM
                // TODO: Move this into a modal with the confirm action refreshing the page
                window.location.href = window.location.origin + window.location.pathname;
            }).catch(function (response) {
                if (response && response.jqXHR && response.jqXHR.responseJSON && response.jqXHR.responseJSON.errors) {
                    self.set('importErrors', response.jqXHR.responseJSON.errors);
                }

                notifications.showAlert('Import Failed', {type: 'error'});
            }).finally(function () {
                self.set('uploadButtonText', 'Import');
            });
        },

        exportData: function () {
            var iframe = $('#iframeDownload'),
                downloadURL = this.get('ghostPaths.url').api('db') +
                    '?access_token=' + this.get('session.secure.access_token');

            if (iframe.length === 0) {
                iframe = $('<iframe>', {id: 'iframeDownload'}).hide().appendTo('body');
            }

            iframe.attr('src', downloadURL);
        },

        sendTestEmail: function () {
            var notifications = this.get('notifications'),
                self = this;

            this.toggleProperty('submitting');

            ajax(this.get('ghostPaths.url').api('mail', 'test'), {
                type: 'POST'
            }).then(function () {
                notifications.showAlert('Check your email for the test message.', {type: 'info'});
                self.toggleProperty('submitting');
            }).catch(function (error) {
                if (typeof error.jqXHR !== 'undefined') {
                    notifications.showAPIError(error);
                } else {
                    notifications.showErrors(error);
                }
                self.toggleProperty('submitting');
            });
        }
    }
});
