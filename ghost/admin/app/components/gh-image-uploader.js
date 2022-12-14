import Component from '@ember/component';
import ghostPaths from 'ghost-admin/utils/ghost-paths';
import {GENERIC_ERROR_MESSAGE} from 'ghost-admin/services/notifications';
import {
    UnsupportedMediaTypeError,
    isRequestEntityTooLargeError,
    isUnsupportedMediaTypeError,
    isVersionMismatchError
} from 'ghost-admin/services/ajax';
import {computed, get} from '@ember/object';
import {htmlSafe} from '@ember/template';
import {inject} from 'ghost-admin/decorators/inject';
import {isArray} from '@ember/array';
import {isBlank} from '@ember/utils';
import {run} from '@ember/runloop';
import {inject as service} from '@ember/service';

export const IMAGE_MIME_TYPES = 'image/gif,image/jpg,image/jpeg,image/png,image/svg+xml,image/webp';
export const IMAGE_EXTENSIONS = ['gif', 'jpg', 'jpeg', 'png', 'svg', 'svgz', 'webp'];
export const IMAGE_PARAMS = {purpose: 'image'};

export const ICON_EXTENSIONS = ['gif', 'ico', 'jpg', 'jpeg', 'png', 'svg', 'svgz', 'webp'];
export const ICON_MIME_TYPES = 'image/x-icon,image/vnd.microsoft.icon,image/gif,image/jpg,image/jpeg,image/png,image/svg+xml,image/webp';
export const ICON_PARAMS = {purpose: 'icon'};

export default Component.extend({
    ajax: service(),
    notifications: service(),
    settings: service(),

    tagName: 'section',
    classNames: ['gh-image-uploader'],
    classNameBindings: ['dragClass'],

    image: null,
    text: '',
    altText: '',
    saveButton: true,
    accept: '',
    extensions: null,
    uploadUrl: null,
    paramName: 'file',
    paramsHash: null,
    resourceName: 'images',
    validate: null,
    allowUnsplash: false,

    dragClass: null,
    failureMessage: null,
    file: null,
    url: null,
    uploadPercentage: 0,

    _defaultAccept: IMAGE_MIME_TYPES,
    _defaultExtensions: IMAGE_EXTENSIONS,
    _defaultUploadUrl: '/images/upload/',
    _defaultParamsHash: IMAGE_PARAMS,
    _showUnsplash: false,

    // Allowed actions
    fileSelected: () => {},
    update: () => {},
    uploadStarted: () => {},
    uploadFinished: () => {},
    uploadSuccess: () => {},
    uploadFailed: () => {},

    config: inject(),

    // TODO: this wouldn't be necessary if the server could accept direct
    // file uploads
    formData: computed('file', function () {
        let file = this.file;
        let formData = new FormData();

        formData.append(this.paramName, file);

        Object.keys(this.paramsHash || {}).forEach((key) => {
            formData.append(key, this.paramsHash[key]);
        });

        return formData;
    }),

    description: computed('text', 'altText', function () {
        let altText = this.altText;

        return this.text || (altText ? `Upload image of "${altText}"` : 'Upload an image');
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

    init() {
        this._super(...arguments);

        if (!this.accept) {
            this.set('accept', this._defaultAccept);
        }
        if (!this.extensions) {
            this.set('extensions', this._defaultExtensions);
        }
        if (!this.uploadUrl) {
            this.set('uploadUrl', this._defaultUploadUrl);
        }
        if (!this.paramsHash) {
            this.set('paramsHash', this._defaultParamsHash);
        }
    },

    didReceiveAttrs() {
        this._super(...arguments);

        let image = this.image;
        this.set('url', image);
    },

    actions: {
        fileSelected(fileList, resetInput) {
            // can't use array destructuring here as FileList is not a strict
            // array and fails in Safari
            let file = fileList[0];
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

        addUnsplashPhoto({src}) {
            this.set('url', src);
            this.send('saveUrl');
        },

        reset() {
            this.set('file', null);
            this.set('uploadPercentage', 0);
        },

        saveUrl() {
            let url = this.url;
            this.update(url);
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

    _uploadProgress(event) {
        if (event.lengthComputable) {
            run(() => {
                let percentage = Math.round((event.loaded / event.total) * 100);
                if (!this.isDestroyed && !this.isDestroying) {
                    this.set('uploadPercentage', percentage);
                }
            });
        }
    },

    _uploadSuccess(response) {
        let uploadResponse;
        let responseUrl;

        try {
            uploadResponse = JSON.parse(response);
        } catch (e) {
            if (!(e instanceof SyntaxError)) {
                throw e;
            }
        }

        if (uploadResponse) {
            let resource = get(uploadResponse, this.resourceName);
            if (resource && isArray(resource) && resource[0]) {
                responseUrl = get(resource[0], 'url');
            }
        }

        this.set('url', responseUrl);
        this.send('saveUrl');
        this.send('reset');
        this.uploadSuccess(responseUrl);
    },

    _uploadFailed(error) {
        let message;

        if (isVersionMismatchError(error)) {
            this.notifications.showAPIError(error);
        }

        if (isUnsupportedMediaTypeError(error)) {
            let validExtensions = this.extensions.join(', .').toUpperCase();
            validExtensions = `.${validExtensions}`;

            message = `The image type you uploaded is not supported. Please use ${validExtensions}`;
        } else if (isRequestEntityTooLargeError(error)) {
            message = 'The image you uploaded was larger than the maximum file size your server allows.';
        } else if (!isBlank(error.payload?.errors?.[0]?.message)) {
            message = error.payload.errors[0].message;
        } else {
            console.error(error); // eslint-disable-line
            message = GENERIC_ERROR_MESSAGE;
        }

        this.set('failureMessage', message);
        this.uploadFailed(error);
    },

    generateRequest() {
        let ajax = this.ajax;
        let formData = this.formData;
        let uploadUrl = this.uploadUrl;
        // CASE: we want to upload an icon and we have to POST it to a different endpoint, expecially for icons
        let url = `${ghostPaths().apiRoot}${uploadUrl}`;

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
            this._uploadSuccess(response);
        }).catch((error) => {
            this._uploadFailed(error);
        }).finally(() => {
            this.uploadFinished();
        });
    },

    _validate(file) {
        if (this.validate) {
            return this.validate(file);
        } else {
            return this._defaultValidator(file);
        }
    },

    _defaultValidator(file) {
        let extensions = this.extensions;
        let [, extension] = (/(?:\.([^.]+))?$/).exec(file.name);

        if (!isArray(extensions)) {
            extensions = extensions.split(',');
        }

        if (!extension || extensions.indexOf(extension.toLowerCase()) === -1) {
            return new UnsupportedMediaTypeError();
        }

        return true;
    }
});
