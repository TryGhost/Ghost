import Component from '@ember/component';
import ghostPaths from 'ghost-admin/utils/ghost-paths';
import {
    UnsupportedMediaTypeError,
    isRequestEntityTooLargeError,
    isUnsupportedMediaTypeError,
    isVersionMismatchError
} from 'ghost-admin/services/ajax';
import {computed} from '@ember/object';
import {htmlSafe} from '@ember/string';
import {invokeAction} from 'ember-invoke-action';
import {isBlank} from '@ember/utils';
import {isArray as isEmberArray} from '@ember/array';
import {run} from '@ember/runloop';
import {inject as service} from '@ember/service';

export const IMAGE_MIME_TYPES = 'image/gif,image/jpg,image/jpeg,image/png,image/svg+xml';
export const IMAGE_EXTENSIONS = ['gif', 'jpg', 'jpeg', 'png', 'svg'];

export default Component.extend({
    ajax: service(),
    config: service(),
    notifications: service(),
    settings: service(),

    tagName: 'section',
    classNames: ['gh-image-uploader'],
    classNameBindings: ['dragClass'],

    image: null,
    text: '',
    altText: '',
    saveButton: true,
    accept: null,
    extensions: null,
    uploadUrl: null,
    validate: null,
    allowUnsplash: false,

    dragClass: null,
    failureMessage: null,
    file: null,
    url: null,
    uploadPercentage: 0,

    _defaultAccept: IMAGE_MIME_TYPES,
    _defaultExtensions: IMAGE_EXTENSIONS,
    _defaultUploadUrl: '/uploads/',
    _showUnsplash: false,

    // TODO: this wouldn't be necessary if the server could accept direct
    // file uploads
    formData: computed('file', function () {
        let file = this.get('file');
        let formData = new FormData();

        formData.append('uploadimage', file);

        return formData;
    }),

    description: computed('text', 'altText', function () {
        let altText = this.get('altText');

        return this.get('text') || (altText ? `Upload image of "${altText}"` : 'Upload an image');
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

    didReceiveAttrs() {
        let image = this.get('image');
        this.set('url', image);

        if (!this.get('accept')) {
            this.set('accept', this.get('_defaultAccept'));
        }
        if (!this.get('extensions')) {
            this.set('extensions', this.get('_defaultExtensions'));
        }
        if (!this.get('uploadUrl')) {
            this.set('uploadUrl', this.get('_defaultUploadUrl'));
        }
    },

    actions: {
        fileSelected(fileList, resetInput) {
            // can't use array destructuring here as FileList is not a strict
            // array and fails in Safari
            // eslint-disable-next-line ember-suave/prefer-destructuring
            let file = fileList[0];
            let validationResult = this._validate(file);

            this.set('file', file);
            invokeAction(this, 'fileSelected', file);

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

        addUnsplashPhoto(photo) {
            this.set('url', photo.urls.regular);
            this.send('saveUrl');
        },

        reset() {
            this.set('file', null);
            this.set('uploadPercentage', 0);
        },

        saveUrl() {
            let url = this.get('url');
            invokeAction(this, 'update', url);
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

    _uploadStarted() {
        invokeAction(this, 'uploadStarted');
    },

    _uploadProgress(event) {
        if (event.lengthComputable) {
            run(() => {
                let percentage = Math.round((event.loaded / event.total) * 100);
                this.set('uploadPercentage', percentage);
            });
        }
    },

    _uploadFinished() {
        invokeAction(this, 'uploadFinished');
    },

    _uploadSuccess(response) {
        this.set('url', response);
        this.send('saveUrl');
        this.send('reset');
        invokeAction(this, 'uploadSuccess', response);
    },

    _uploadFailed(error) {
        let message;

        if (isVersionMismatchError(error)) {
            this.get('notifications').showAPIError(error);
        }

        if (isUnsupportedMediaTypeError(error)) {
            let validExtensions = this.get('extensions').join(', .').toUpperCase();
            validExtensions = `.${validExtensions}`;

            message = `The image type you uploaded is not supported. Please use ${validExtensions}`;
        } else if (isRequestEntityTooLargeError(error)) {
            message = 'The image you uploaded was larger than the maximum file size your server allows.';
        } else if (error.payload.errors && !isBlank(error.payload.errors[0].message)) {
            message = error.payload.errors[0].message;
        } else {
            message = 'Something went wrong :(';
        }

        this.set('failureMessage', message);
        invokeAction(this, 'uploadFailed', error);
    },

    generateRequest() {
        let ajax = this.get('ajax');
        let formData = this.get('formData');
        let uploadUrl = this.get('uploadUrl');
        // CASE: we want to upload an icon and we have to POST it to a different endpoint, expecially for icons
        let url = `${ghostPaths().apiRoot}${uploadUrl}`;

        this._uploadStarted();

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
            let url = JSON.parse(response);
            this._uploadSuccess(url);
        }).catch((error) => {
            this._uploadFailed(error);
        }).finally(() => {
            this._uploadFinished();
        });
    },

    _validate(file) {
        if (this.get('validate')) {
            return invokeAction(this, 'validate', file);
        } else {
            return this._defaultValidator(file);
        }
    },

    _defaultValidator(file) {
        let extensions = this.get('extensions');
        let [, extension] = (/(?:\.([^.]+))?$/).exec(file.name);

        if (!isEmberArray(extensions)) {
            extensions = extensions.split(',');
        }

        if (!extension || extensions.indexOf(extension.toLowerCase()) === -1) {
            return new UnsupportedMediaTypeError();
        }

        return true;
    }
});
