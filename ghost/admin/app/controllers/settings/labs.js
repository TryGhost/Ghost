/* eslint-disable ghost/ember/alias-model-in-controller */
import $ from 'jquery';
import Controller from '@ember/controller';
import RSVP from 'rsvp';
import config from 'ghost-admin/config/environment';
import {
    UnsupportedMediaTypeError,
    isRequestEntityTooLargeError,
    isUnsupportedMediaTypeError
} from 'ghost-admin/services/ajax';
import {isBlank} from '@ember/utils';
import {isArray as isEmberArray} from '@ember/array';
import {run} from '@ember/runloop';
import {inject as service} from '@ember/service';
import {set} from '@ember/object';
import {task, timeout} from 'ember-concurrency';

const {Promise} = RSVP;

const IMPORT_MIME_TYPES = [
    'application/json',
    'application/zip',
    'application/x-zip-compressed'
];

const JSON_EXTENSION = ['json'];
const JSON_MIME_TYPE = ['application/json'];

const YAML_EXTENSION = ['yaml'];
const YAML_MIME_TYPE = [
    'text/vnd.yaml',
    'application/vnd.yaml',
    'text/x-yaml',
    'application/x-yaml'
];

export default Controller.extend({
    ajax: service(),
    config: service(),
    feature: service(),
    ghostPaths: service(),
    notifications: service(),
    session: service(),
    settings: service(),

    importErrors: null,
    importSuccessful: false,
    showDeleteAllModal: false,
    showEarlyAccessModal: false,
    submitting: false,
    uploadButtonText: 'Import',

    importMimeType: null,
    redirectsFileExtensions: null,
    redirectsFileMimeTypes: null,
    yamlExtension: null,
    yamlMimeType: null,

    yamlAccept: null,

    isOAuthConfigurationOpen: false,

    init() {
        this._super(...arguments);
        this.importMimeType = IMPORT_MIME_TYPES;
        this.redirectsFileExtensions = [...JSON_EXTENSION, ...YAML_EXTENSION];
        // .yaml is added below for file dialogs to show .yaml by default.
        this.redirectsFileMimeTypes = [...JSON_MIME_TYPE, ...YAML_MIME_TYPE, '.yaml'];
        this.yamlExtension = YAML_EXTENSION;
        this.yamlMimeType = YAML_MIME_TYPE;
        // (macOS) Safari only allows files with the `yml` extension to be selected with the specified MIME types
        // so explicitly allow the `yaml` extension.
        this.yamlAccept = [...this.yamlMimeType, ...Array.from(this.yamlExtension, extension => '.' + extension)];
    },

    actions: {
        onUpload(file) {
            let formData = new FormData();
            let notifications = this.notifications;
            let currentUserId = this.get('session.user.id');
            let dbUrl = this.get('ghostPaths.url').api('db');

            this.set('uploadButtonText', 'Importing');
            this.set('importErrors', null);
            this.set('importSuccessful', false);

            return this._validate(file).then(() => {
                formData.append('importfile', file);

                return this.ajax.post(dbUrl, {
                    data: formData,
                    dataType: 'json',
                    cache: false,
                    contentType: false,
                    processData: false
                });
            }).then((response) => {
                let store = this.store;

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
                    this.session.populateUser({id: currentUserId});

                    // TODO: keep as notification, add link to view content
                    notifications.showNotification('Import successful', {key: 'import.upload.success'});

                    // reload settings
                    return this.settings.reload().then((settings) => {
                        this.feature.fetch();
                        this.config.set('blogTitle', settings.get('title'));
                    });
                });
            }).catch((response) => {
                if (isUnsupportedMediaTypeError(response) || isRequestEntityTooLargeError(response)) {
                    this.set('importErrors', [response]);
                } else if (response && response.payload.errors && isEmberArray(response.payload.errors)) {
                    this.set('importErrors', response.payload.errors);
                } else {
                    this.set('importErrors', [{message: 'Import failed due to an unknown error. Check the Web Inspector console and network tabs for errors.'}]);
                }

                throw response;
            }).finally(() => {
                this.set('uploadButtonText', 'Import');
            });
        },

        downloadFile(endpoint) {
            let downloadURL = this.get('ghostPaths.url').api(endpoint);
            let iframe = $('#iframeDownload');

            if (iframe.length === 0) {
                iframe = $('<iframe>', {id: 'iframeDownload'}).hide().appendTo('body');
            }

            iframe.attr('src', downloadURL);
        },

        async saveOAuthSettings() {
            await this.settings.save();
        },

        toggleDeleteAllModal() {
            this.toggleProperty('showDeleteAllModal');
        },

        toggleEarlyAccessModal() {
            this.toggleProperty('showEarlyAccessModal');
        },

        async toggleIsOAuthEnabled() {
            if (this.isOAuthEnabled) {
                this.settings.set('oauthClientId', '');
                this.settings.set('oauthClientSecret', '');
                set(this, 'isOAuthConfigurationOpen', false);
                await this.settings.save();
            } else {
                set(this, 'isOAuthConfigurationOpen', true);
            }
        },

        /**
         * Opens a file selection dialog - Triggered by "Upload x" buttons,
         * searches for the hidden file input within the .gh-setting element
         * containing the clicked button then simulates a click
         * @param  {MouseEvent} event - MouseEvent fired by the button click
         */
        triggerFileDialog(event) {
            // simulate click to open file dialog
            // using jQuery because IE11 doesn't support MouseEvent
            $(event.target)
                .closest('.gh-setting-action')
                .find('input[type="file"]')
                .click();
        }
    },

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

        let accept = this.importMimeType;

        if (!isBlank(accept) && file && accept.indexOf(file.type) === -1) {
            return RSVP.reject(new UnsupportedMediaTypeError());
        }

        return RSVP.resolve();
    },

    redirectUploadResult: task(function* (success) {
        this.set('redirectSuccess', success);
        this.set('redirectFailure', !success);

        yield timeout(config.environment === 'test' ? 100 : 5000);

        this.set('redirectSuccess', null);
        this.set('redirectFailure', null);
        return true;
    }).drop(),

    routesUploadResult: task(function* (success) {
        this.set('routesSuccess', success);
        this.set('routesFailure', !success);

        yield timeout(config.environment === 'test' ? 100 : 5000);

        this.set('routesSuccess', null);
        this.set('routesFailure', null);
        return true;
    }).drop(),

    reset() {
        this.set('importErrors', null);
        this.set('importSuccessful', false);
    }
});
