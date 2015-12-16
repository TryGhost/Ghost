import Ember from 'ember';
import {request as ajax} from 'ic-ajax';

const {$, Controller, computed, inject} = Ember;

export default Controller.extend({
    uploadButtonText: 'Import',
    importErrors: '',
    submitting: false,

    ghostPaths: inject.service('ghost-paths'),
    notifications: inject.service(),
    session: inject.service(),
    feature: inject.controller(),

    labsJSON: computed('model.labs', function () {
        return JSON.parse(this.get('model.labs') || {});
    }),

    saveLabs(optionName, optionValue) {
        let labsJSON =  this.get('labsJSON');

        // Set new value in the JSON object
        labsJSON[optionName] = optionValue;

        this.set('model.labs', JSON.stringify(labsJSON));

        this.get('model').save().catch((errors) => {
            this.showErrors(errors);
            this.get('model').rollbackAttributes();
        });
    },

    usePublicAPI: computed('feature.publicAPI', {
        get() {
            return this.get('feature.publicAPI');
        },
        set(key, value) {
            this.saveLabs('publicAPI', value);
            return value;
        }
    }),

    actions: {
        onUpload(file) {
            let formData = new FormData();
            let notifications = this.get('notifications');
            let currentUserId = this.get('session.user.id');

            this.set('uploadButtonText', 'Importing');
            this.set('importErrors', '');

            formData.append('importfile', file);

            ajax(this.get('ghostPaths.url').api('db'), {
                type: 'POST',
                data: formData,
                dataType: 'json',
                cache: false,
                contentType: false,
                processData: false
            }).then(() => {
                // Clear the store, so that all the new data gets fetched correctly.
                this.store.unloadAll();
                // Reload currentUser and set session
                this.set('session.user', this.store.findRecord('user', currentUserId));
                // TODO: keep as notification, add link to view content
                notifications.showNotification('Import successful.');
                notifications.closeAlerts('import.upload');
            }).catch((response) => {
                if (response && response.jqXHR && response.jqXHR.responseJSON && response.jqXHR.responseJSON.errors) {
                    this.set('importErrors', response.jqXHR.responseJSON.errors);
                }

                notifications.showAlert('Import Failed', {type: 'error', key: 'import.upload.failed'});
            }).finally(() => {
                this.set('uploadButtonText', 'Import');
            });
        },

        exportData() {
            let dbUrl = this.get('ghostPaths.url').api('db');
            let accessToken = this.get('session.data.authenticated.access_token');
            let downloadURL = `${dbUrl}?access_token=${accessToken}`;
            let iframe = $('#iframeDownload');

            if (iframe.length === 0) {
                iframe = $('<iframe>', {id: 'iframeDownload'}).hide().appendTo('body');
            }

            iframe.attr('src', downloadURL);
        },

        sendTestEmail() {
            let notifications = this.get('notifications');

            this.toggleProperty('submitting');

            ajax(this.get('ghostPaths.url').api('mail', 'test'), {
                type: 'POST'
            }).then(() => {
                notifications.showAlert('Check your email for the test message.', {type: 'info', key: 'test-email.send.success'});
                this.toggleProperty('submitting');
            }).catch((error) => {
                if (typeof error.jqXHR !== 'undefined') {
                    notifications.showAPIError(error, {key: 'test-email.send'});
                } else {
                    notifications.showErrors(error, {key: 'test-email.send'});
                }
                this.toggleProperty('submitting');
            });
        }
    }
});
