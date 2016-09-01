import $ from 'jquery';
import RSVP from 'rsvp';
import Controller from 'ember-controller';
import injectService from 'ember-service/inject';
import {isBlank} from 'ember-utils';
import {isEmberArray} from 'ember-array/utils';
import {UnsupportedMediaTypeError, isUnsupportedMediaTypeError} from 'ghost-admin/services/ajax';

const {Promise} = RSVP;

export default Controller.extend({
    uploadButtonText: 'Import',
    importErrors: '',
    submitting: false,
    showDeleteAllModal: false,

    importMimeType: ['application/json', 'application/zip', 'application/x-zip-compressed'],

    ghostPaths: injectService(),
    notifications: injectService(),
    session: injectService(),
    ajax: injectService(),

    // TODO: convert to ember-concurrency task
    _validate(file) {
        // Windows doesn't have mime-types for json files by default, so we
        // need to have some additional checking
        if (file.type === '') {
            // First check file extension so we can early return
            let [, extension] = (/(?:\.([^.]+))?$/).exec(file.name);

            if (!extension || extension.toLowerCase() !== 'json') {
                return RSVP.reject(new UnsupportedMediaTypeError());
            }

            return new Promise((resolve, reject) => {
                // Extension is correct, so check the contents of the file
                let reader = new FileReader();

                reader.onload = function () {
                    let {result} = reader;

                    try {
                        JSON.parse(result);

                        return resolve();
                    } catch (e) {
                        return reject(new UnsupportedMediaTypeError());
                    }
                };

                reader.readAsText(file);
            });
        }

        let accept = this.get('importMimeType');

        if (!isBlank(accept) && file && accept.indexOf(file.type) === -1) {
            return RSVP.reject(new UnsupportedMediaTypeError());
        }

        return RSVP.resolve();
    },

    actions: {
        onUpload(file) {
            let formData = new FormData();
            let notifications = this.get('notifications');
            let currentUserId = this.get('session.user.id');
            let dbUrl = this.get('ghostPaths.url').api('db');

            this.set('uploadButtonText', 'Importing');
            this.set('importErrors', '');

            return this._validate(file).then(() => {
                formData.append('importfile', file);

                return this.get('ajax').post(dbUrl, {
                    data: formData,
                    dataType: 'json',
                    cache: false,
                    contentType: false,
                    processData: false
                });
            }).then(() => {
                // Clear the store, so that all the new data gets fetched correctly.
                this.store.unloadAll();
                // Reload currentUser and set session
                this.set('session.user', this.store.findRecord('user', currentUserId));
                // TODO: keep as notification, add link to view content
                notifications.showNotification('Import successful.', {key: 'import.upload.success'});
            }).catch((response) => {
                if (isUnsupportedMediaTypeError(response)) {
                    this.set('importErrors', [response]);
                    return;
                }

                if (response && response.errors && isEmberArray(response.errors)) {
                    this.set('importErrors', response.errors);
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
            let emailUrl = this.get('ghostPaths.url').api('mail', 'test');

            this.toggleProperty('submitting');

            this.get('ajax').post(emailUrl).then(() => {
                notifications.showAlert('Check your email for the test message.', {type: 'info', key: 'test-email.send.success'});
                this.toggleProperty('submitting');
            }).catch((error) => {
                notifications.showAPIError(error, {key: 'test-email:send'});
                this.toggleProperty('submitting');
            });
        },

        toggleDeleteAllModal() {
            this.toggleProperty('showDeleteAllModal');
        }
    }
});
