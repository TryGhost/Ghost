import Component from 'ember-component';
import {htmlSafe} from 'ember-string';
import injectService from 'ember-service/inject';
import computed from 'ember-computed';
import {isBlank} from 'ember-utils';
import run from 'ember-runloop';
import {isEmberArray} from 'ember-array/utils';

import { invoke, invokeAction } from 'ember-invoke-action';
import {
    isVersionMismatchError,
    isRequestEntityTooLargeError,
    isUnsupportedMediaTypeError,
    UnsupportedMediaTypeError
} from 'ghost-admin/services/ajax';

export default Component.extend({
    tagName: 'section',
    classNames: ['gh-image-uploader'],
    classNameBindings: ['dragClass'],

    labelText: 'Select or drag-and-drop a file',
    url: null,
    paramName: 'file',
    accept: ['text/csv'],
    extensions: ['csv'],
    validate: null,

    file: null,
    response: null,

    dragClass: null,
    failureMessage: null,
    uploadPercentage: 0,

    ajax: injectService(),
    eventBus: injectService(),
    notifications: injectService(),

    formData: computed('file', function () {
        let paramName = this.get('paramName');
        let file = this.get('file');
        let formData = new FormData();

        formData.append(paramName, file);

        return formData;
    }),

    progressStyle: computed('uploadPercentage', function () {
        let percentage = this.get('uploadPercentage');
        let width = '';

        if (percentage > 0) {
            width = `${percentage}%`;
        } else {
            width = '0';
        }

        return htmlSafe(`width: ${width}`);
    }),

    // we can optionally listen to a named event bus channel so that the upload
    // process can be triggered externally
    init() {
        this._super(...arguments);
        let listenTo = this.get('listenTo');

        if (listenTo) {
            this.get('eventBus').subscribe(`${listenTo}:upload`, this, function (file) {
                if (file) {
                    this.set('file', file);
                }
                this.send('upload');
            });
        }
    },

    didReceiveAttrs() {
        this._super(...arguments);
        let accept = this.get('accept');
        let extensions = this.get('extensions');

        this._accept = (!isBlank(accept) && !isEmberArray(accept)) ? accept.split(',') : accept;
        this._extensions = (!isBlank(extensions) && !isEmberArray(extensions)) ? extensions.split(',') : extensions;
    },

    willDestroyElement() {
        let listenTo = this.get('listenTo');

        this._super(...arguments);

        if (listenTo) {
            this.get('eventBus').unsubscribe(`${listenTo}:upload`);
        }
    },

    dragOver(event) {
        if (!event.dataTransfer) {
            return;
        }

        // this is needed to work around inconsistencies with dropping files
        // from Chrome's downloads bar
        let eA = event.dataTransfer.effectAllowed;
        event.dataTransfer.dropEffect = (eA === 'move' || eA === 'linkMove') ? 'move' : 'copy';

        event.stopPropagation();
        event.preventDefault();

        this.set('dragClass', '-drag-over');
    },

    dragLeave(event) {
        event.preventDefault();
        this.set('dragClass', null);
    },

    drop(event) {
        event.preventDefault();
        this.set('dragClass', null);
        if (event.dataTransfer.files) {
            invoke(this, 'fileSelected', event.dataTransfer.files);
        }
    },

    generateRequest() {
        let ajax = this.get('ajax');
        let formData = this.get('formData');
        let url = this.get('url');

        invokeAction(this, 'uploadStarted');

        ajax.post(url, {
            data: formData,
            processData: false,
            contentType: false,
            dataType: 'text',
            xhr: () => {
                let xhr = new window.XMLHttpRequest();

                xhr.upload.addEventListener('progress', (event) => {
                    this._uploadProgress(event);
                }, false);

                return xhr;
            }
        }).then((response) => {
            this._uploadSuccess(JSON.parse(response));
        }).catch((error) => {
            this._uploadFailed(error);
        }).finally(() => {
            invokeAction(this, 'uploadFinished');
        });
    },

    _uploadProgress(event) {
        if (event.lengthComputable) {
            run(() => {
                let percentage = Math.round((event.loaded / event.total) * 100);
                this.set('uploadPercentage', percentage);
            });
        }
    },

    _uploadSuccess(response) {
        invokeAction(this, 'uploadSuccess', response);
        invoke(this, 'reset');
    },

    _uploadFailed(error) {
        let message;

        if (isVersionMismatchError(error)) {
            this.get('notifications').showAPIError(error);
        }

        if (isUnsupportedMediaTypeError(error)) {
            message = 'The file type you uploaded is not supported.';
        } else if (isRequestEntityTooLargeError(error)) {
            message = 'The file you uploaded was larger than the maximum file size your server allows.';
        } else if (error.errors && !isBlank(error.errors[0].message)) {
            message = htmlSafe(error.errors[0].message);
        } else {
            message = 'Something went wrong :(';
        }

        this.set('failureMessage', message);
        invokeAction(this, 'uploadFailed', error);
    },

    _validate(file) {
        if (this.get('validate')) {
            return invokeAction(this, 'validate', file);
        } else {
            return this._defaultValidator(file);
        }
    },

    _defaultValidator(file) {
        let [, extension] = (/(?:\.([^.]+))?$/).exec(file.name);
        let extensions = this._extensions;

        if (!extension || extensions.indexOf(extension.toLowerCase()) === -1) {
            return new UnsupportedMediaTypeError();
        }

        return true;
    },

    actions: {
        fileSelected(fileList) {
            // can't use array destructuring here as FileList is not a strict
            // array and fails in Safari
            // jscs:disable requireArrayDestructuring
            let file = fileList[0];
            // jscs:enable requireArrayDestructuring
            let validationResult = this._validate(file);

            this.set('file', file);
            invokeAction(this, 'fileSelected', file);

            if (validationResult === true) {
                run.schedule('actions', this, function () {
                    this.generateRequest();
                });
            } else {
                this._uploadFailed(validationResult);
            }
        },

        upload() {
            if (this.get('file')) {
                this.generateRequest();
            }
        },

        reset() {
            this.set('file', null);
            this.set('uploadPercentage', 0);
            this.set('failureMessage', null);
        }
    }
});
