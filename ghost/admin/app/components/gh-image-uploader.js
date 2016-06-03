import Ember from 'ember';
import ghostPaths from 'ghost-admin/utils/ghost-paths';
import {RequestEntityTooLargeError, UnsupportedMediaTypeError} from 'ghost-admin/services/ajax';

const {
    Component,
    computed,
    inject: {service},
    isBlank,
    run
} = Ember;

export default Component.extend({
    tagName: 'section',
    classNames: ['gh-image-uploader'],
    classNameBindings: ['dragClass'],

    image: null,
    text: 'Upload an image',
    saveButton: true,

    dragClass: null,
    failureMessage: null,
    file: null,
    formType: 'upload',
    url: null,
    uploadPercentage: 0,

    ajax: service(),
    config: service(),

    // TODO: this wouldn't be necessary if the server could accept direct
    // file uploads
    formData: computed('file', function () {
        let file = this.get('file');
        let formData = new FormData();

        formData.append('uploadimage', file);

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

        return Ember.String.htmlSafe(`width: ${width}`);
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

    uploadStarted() {
        if (typeof this.attrs.uploadStarted === 'function') {
            this.attrs.uploadStarted();
        }
    },

    uploadProgress(event) {
        if (event.lengthComputable) {
            run(() => {
                let percentage = Math.round((event.loaded / event.total) * 100);
                this.set('uploadPercentage', percentage);
            });
        }
    },

    uploadFinished() {
        if (typeof this.attrs.uploadFinished === 'function') {
            this.attrs.uploadFinished();
        }
    },

    uploadSuccess(response) {
        this.set('url', response);
        this.send('saveUrl');
        this.send('reset');
    },

    uploadFailed(error) {
        let message;

        if (error instanceof UnsupportedMediaTypeError) {
            message = 'The image type you uploaded is not supported. Please use .PNG, .JPG, .GIF, .SVG.';
        } else if (error instanceof RequestEntityTooLargeError) {
            message = 'The image you uploaded was larger than the maximum file size your server allows.';
        } else if (error.errors && !isBlank(error.errors[0].message)) {
            message = error.errors[0].message;
        } else {
            message = 'Something went wrong :(';
        }

        this.set('failureMessage', message);
    },

    generateRequest() {
        let ajax = this.get('ajax');
        let formData = this.get('formData');
        let url = `${ghostPaths().apiRoot}/uploads/`;

        this.uploadStarted();

        ajax.post(url, {
            data: formData,
            processData: false,
            contentType: false,
            dataType: 'text',
            xhr: () => {
                let xhr = new window.XMLHttpRequest();

                xhr.upload.addEventListener('progress', (event) => {
                    this.uploadProgress(event);
                }, false);

                return xhr;
            }
        }).then((response) => {
            let url = JSON.parse(response);
            this.uploadSuccess(url);
        }).catch((error) => {
            this.uploadFailed(error);
        }).finally(() => {
            this.uploadFinished();
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

            if (typeof this.attrs.onInput === 'function') {
                this.attrs.onInput(url);
            }
        },

        reset() {
            this.set('file', null);
            this.set('uploadPercentage', 0);
        },

        switchForm(formType) {
            this.set('formType', formType);

            if (typeof this.attrs.formChanged === 'function') {
                run.scheduleOnce('afterRender', this, function () {
                    this.attrs.formChanged(formType);
                });
            }
        },

        saveUrl() {
            let url = this.get('url');
            this.attrs.update(url);
        }
    }
});
