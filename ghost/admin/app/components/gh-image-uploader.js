import Component from 'ember-component';
import computed from 'ember-computed';
import injectService from 'ember-service/inject';
import {htmlSafe} from 'ember-string';
import {isBlank} from 'ember-utils';
import run from 'ember-runloop';

import {invokeAction} from 'ember-invoke-action';
import ghostPaths from 'ghost-admin/utils/ghost-paths';
import {
    isRequestEntityTooLargeError,
    isUnsupportedMediaTypeError,
    isVersionMismatchError
} from 'ghost-admin/services/ajax';

export default Component.extend({
    tagName: 'section',
    classNames: ['gh-image-uploader'],
    classNameBindings: ['dragClass'],

    image: null,
    text: '',
    altText: '',
    saveButton: true,

    dragClass: null,
    failureMessage: null,
    file: null,
    formType: 'upload',
    url: null,
    uploadPercentage: 0,

    ajax: injectService(),
    config: injectService(),
    notifications: injectService(),

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

    canShowUploadForm: computed('config.fileStorage', function () {
        return this.get('config.fileStorage') !== false;
    }),

    showUploadForm: computed('formType', function () {
        let canShowUploadForm = this.get('canShowUploadForm');
        let formType = this.get('formType');

        return formType === 'upload' && canShowUploadForm;
    }),

    didReceiveAttrs() {
        let image = this.get('image');
        this.set('url', image);
    },

    dragOver(event) {
        let showUploadForm = this.get('showUploadForm');

        if (!event.dataTransfer) {
            return;
        }

        // this is needed to work around inconsistencies with dropping files
        // from Chrome's downloads bar
        let eA = event.dataTransfer.effectAllowed;
        event.dataTransfer.dropEffect = (eA === 'move' || eA === 'linkMove') ? 'move' : 'copy';

        event.stopPropagation();
        event.preventDefault();

        if (showUploadForm) {
            this.set('dragClass', '--drag-over');
        }
    },

    dragLeave(event) {
        let showUploadForm = this.get('showUploadForm');

        event.preventDefault();

        if (showUploadForm) {
            this.set('dragClass', null);
        }
    },

    drop(event) {
        let showUploadForm = this.get('showUploadForm');

        event.preventDefault();

        this.set('dragClass', null);

        if (showUploadForm) {
            if (event.dataTransfer.files) {
                this.send('fileSelected', event.dataTransfer.files);
            }
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
            message = 'The image type you uploaded is not supported. Please use .PNG, .JPG, .GIF, .SVG.';
        } else if (isRequestEntityTooLargeError(error)) {
            message = 'The image you uploaded was larger than the maximum file size your server allows.';
        } else if (error.errors && !isBlank(error.errors[0].message)) {
            message = error.errors[0].message;
        } else {
            message = 'Something went wrong :(';
        }

        this.set('failureMessage', message);
        invokeAction(this, 'uploadFailed', error);
    },

    generateRequest() {
        let ajax = this.get('ajax');
        let formData = this.get('formData');
        let url = `${ghostPaths().apiRoot}/uploads/`;

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

    actions: {
        fileSelected(fileList) {
            this.set('file', fileList[0]);
            run.schedule('actions', this, function () {
                this.generateRequest();
            });
        },

        onInput(url) {
            this.set('url', url);
            invokeAction(this, 'onInput', url);
        },

        reset() {
            this.set('file', null);
            this.set('uploadPercentage', 0);
        },

        switchForm(formType) {
            this.set('formType', formType);

            run.scheduleOnce('afterRender', this, function () {
                invokeAction(this, 'formChanged', formType);
            });
        },

        saveUrl() {
            let url = this.get('url');
            invokeAction(this, 'update', url);
        }
    }
});
