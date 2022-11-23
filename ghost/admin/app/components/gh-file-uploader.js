import Component from '@ember/component';
import {GENERIC_ERROR_MESSAGE} from 'ghost-admin/services/notifications';
import {
    UnsupportedMediaTypeError,
    isRequestEntityTooLargeError,
    isUnsupportedMediaTypeError,
    isVersionMismatchError
} from 'ghost-admin/services/ajax';
import {computed} from '@ember/object';
import {htmlSafe} from '@ember/template';
import {isBlank} from '@ember/utils';
import {isArray as isEmberArray} from '@ember/array';
import {run} from '@ember/runloop';
import {inject as service} from '@ember/service';

const DEFAULTS = {
    accept: ['text/csv'],
    extensions: ['csv']
};

export default Component.extend({
    ajax: service(),
    eventBus: service(),
    notifications: service(),

    tagName: 'section',
    classNames: ['gh-image-uploader'],
    classNameBindings: ['dragClass'],

    labelText: 'Select or drag-and-drop a file',
    url: null,
    paramName: 'file',
    accept: null,
    extensions: null,
    validate: null,

    file: null,
    response: null,

    dragClass: null,
    failureMessage: null,
    uploadPercentage: 0,

    // Allowed actions
    fileSelected: () => {},
    uploadStarted: () => {},
    uploadFinished: () => {},
    uploadSuccess: () => {},
    uploadFailed: () => {},

    formData: computed('file', function () {
        let paramName = this.paramName;
        let file = this.file;
        let formData = new FormData();

        formData.append(paramName, file);

        return formData;
    }),

    progressStyle: computed('uploadPercentage', function () {
        let percentage = this.uploadPercentage;
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
        let listenTo = this.listenTo;

        this.accept = this.accept || DEFAULTS.accept;
        this.extensions = this.extensions || DEFAULTS.extensions;

        this._uploadEventHandler = function (file) {
            if (file) {
                this.set('file', file);
            }
            this.send('upload');
        };

        if (listenTo) {
            this.eventBus.subscribe(`${listenTo}:upload`, this, this._uploadEventHandler);
        }
    },

    didReceiveAttrs() {
        this._super(...arguments);
        let accept = this.accept;
        let extensions = this.extensions;

        this._accept = (!isBlank(accept) && !isEmberArray(accept)) ? accept.split(',') : accept;
        this._extensions = (!isBlank(extensions) && !isEmberArray(extensions)) ? extensions.split(',') : extensions;
    },

    willDestroyElement() {
        let listenTo = this.listenTo;

        this._super(...arguments);

        if (listenTo) {
            this.eventBus.unsubscribe(`${listenTo}:upload`, this, this._uploadEventHandler);
        }
    },

    actions: {
        fileSelected(fileList, resetInput) {
            let [file] = Array.from(fileList);
            let validationResult = this._validate(file);

            this.set('file', file);
            this.fileSelected(file);

            if (validationResult === true) {
                run.schedule('actions', this, function () {
                    this.generateRequest();

                    if (resetInput) {
                        resetInput();
                    }
                });
            } else {
                this._uploadFailed(validationResult);

                if (resetInput) {
                    resetInput();
                }
            }
        },

        upload() {
            if (this.file) {
                this.generateRequest();
            }
        },

        reset() {
            this.set('file', null);
            this.set('uploadPercentage', 0);
            this.set('failureMessage', null);
        },

        retry() {
            this.send('reset');
            this.send('fileSelected', ...arguments);
        }
    },

    dragOver(event) {
        if (!event.dataTransfer) {
            return;
        }

        // this is needed to work around inconsistencies with dropping files
        // from Chrome's downloads bar
        if (navigator.userAgent.indexOf('Chrome') > -1) {
            let eA = event.dataTransfer.effectAllowed;
            event.dataTransfer.dropEffect = (eA === 'move' || eA === 'linkMove') ? 'move' : 'copy';
        }

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
            this.send('fileSelected', event.dataTransfer.files);
        }
    },

    generateRequest() {
        let ajax = this.ajax;
        let formData = this.formData;
        let url = this.url;

        this.uploadStarted();

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
            this.uploadFinished();
        });
    },

    _uploadProgress(event) {
        if (event.lengthComputable && !this.isDestroyed && !this.isDestroying) {
            run(() => {
                let percentage = Math.round((event.loaded / event.total) * 100);
                this.set('uploadPercentage', percentage);
            });
        }
    },

    _uploadSuccess(response) {
        this.uploadSuccess(response);
        this.send('reset');
    },

    _uploadFailed(error) {
        let message;

        if (isVersionMismatchError(error)) {
            this.notifications.showAPIError(error);
        }

        if (isUnsupportedMediaTypeError(error)) {
            message = 'The file type you uploaded is not supported.';
        } else if (isRequestEntityTooLargeError(error)) {
            message = 'The file you uploaded was larger than the maximum file size your server allows.';
        } else if (error.payload && error.payload.errors && !isBlank(error.payload.errors[0].message)) {
            message = htmlSafe(error.payload.errors[0].message);
        } else {
            console.error(error); // eslint-disable-line
            message = GENERIC_ERROR_MESSAGE;
        }

        this.set('failureMessage', message);
        this.uploadFailed(error);
    },

    _validate(file) {
        if (this.validate) {
            return this.validate(file);
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
    }
});
