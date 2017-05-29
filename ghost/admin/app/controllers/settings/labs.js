import $ from 'jquery';
import Controller from 'ember-controller';
import RSVP from 'rsvp';
import injectService from 'ember-service/inject';
import run from 'ember-runloop';
import {
    UnsupportedMediaTypeError,
    isUnsupportedMediaTypeError
} from 'ghost-admin/services/ajax';
import {isBlank} from 'ember-utils';
import {isEmberArray} from 'ember-array/utils';
import {task} from 'ember-concurrency';

const {Promise} = RSVP;

export default Controller.extend({
    importErrors: null,
    importSuccessful: false,
    showDeleteAllModal: false,
    submitting: false,
    uploadButtonText: 'Import',

    importMimeType: ['application/json', 'application/zip', 'application/x-zip-compressed'],

    ghostPaths: injectService(),
    notifications: injectService(),
    session: injectService(),
    settings: injectService(),
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

    sendTestEmail: task(function* () {
        let notifications = this.get('notifications');
        let emailUrl = this.get('ghostPaths.url').api('mail', 'test');

        try {
            yield this.get('ajax').post(emailUrl);
            notifications.showAlert('Check your email for the test message.', {type: 'info', key: 'test-email.send.success'});
            return true;

        } catch (error) {
            notifications.showAPIError(error, {key: 'test-email:send'});
        }
    }).drop(),

    reset() {
        this.set('importErrors', null);
        this.set('importSuccessful', false);
    },

    actions: {
        onUpload(file) {
            let formData = new FormData();
            let notifications = this.get('notifications');
            let currentUserId = this.get('session.user.id');
            let dbUrl = this.get('ghostPaths.url').api('db');

            this.set('uploadButtonText', 'Importing');
            this.set('importErrors', null);
            this.set('importSuccessful', false);

            return this._validate(file).then(() => {
                formData.append('importfile', file);

                return this.get('ajax').post(dbUrl, {
                    data: formData,
                    dataType: 'json',
                    cache: false,
                    contentType: false,
                    processData: false
                });
            }).then((response) => {
                let store = this.get('store');

                this.set('importSuccessful', true);

                if (response.problems) {
                    this.set('importErrors', response.problems);
                }

                // Clear the store, so that all the new data gets fetched correctly.
                store.unloadAll();

                // NOTE: workaround for behaviour change in Ember 2.13
                // store.unloadAll has some async tendencies so we need to schedule
                // the reload of the current user once the unload has finished
                // https://github.com/emberjs/data/issues/4963
                run.schedule('destroy', this, () => {
                    // Reload currentUser and set session
                    this.set('session.user', store.findRecord('user', currentUserId));

                    // TODO: keep as notification, add link to view content
                    notifications.showNotification('Import successful.', {key: 'import.upload.success'});

                    // reload settings
                    return this.get('settings').reload();
                });
            }).catch((response) => {
                if (isUnsupportedMediaTypeError(response)) {
                    this.set('importErrors', [response]);
                    return;
                }

                if (response && response.errors && isEmberArray(response.errors)) {
                    this.set('importErrors', response.errors);
                }
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

        toggleDeleteAllModal() {
            this.toggleProperty('showDeleteAllModal');
        }
    }
});
