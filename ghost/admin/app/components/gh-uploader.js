import Component from '@ember/component';
import EmberObject, {get} from '@ember/object';
import classic from 'ember-classic-decorator';
import ghostPaths from 'ghost-admin/utils/ghost-paths';
import {
    ICON_EXTENSIONS,
    ICON_MIME_TYPES,
    IMAGE_EXTENSIONS,
    IMAGE_MIME_TYPES
} from 'ghost-admin/components/gh-image-uploader';
import {all, task} from 'ember-concurrency';
import {isArray} from '@ember/array';
import {isEmpty} from '@ember/utils';
import {run} from '@ember/runloop';
import {inject as service} from '@ember/service';

// TODO: this is designed to be a more re-usable/composable upload component, it
// should be able to replace the duplicated upload logic in:
// - gh-image-uploader
// - gh-file-uploader
//
// In order to support the above components we'll need to introduce an
// "allowMultiple" attribute so that single-image uploads don't allow multiple
// simultaneous uploads

const MAX_SIMULTANEOUS_UPLOADS = 2;

/**
 * Result from a file upload
 * @typedef {Object} UploadResult
 * @property {string} fileName - file name, eg "my-image.png"
 * @property {string} url - url relative to Ghost root,eg "/content/images/2017/05/my-image.png"
 */

@classic
class UploadTracker extends EmberObject {
    file = null;
    total = 0;
    loaded = 0;

    init() {
        super.init(...arguments);
        this.total = this.file && this.file.size || 0;
    }

    update({loaded, total}) {
        this.total = total;
        this.loaded = loaded;
    }
}

export default Component.extend({
    ajax: service(),

    tagName: '',

    // Public attributes
    accept: '',
    extensions: '',
    files: null,
    paramName: 'file',
    paramsHash: null,
    resourceName: 'images',
    uploadUrl: null,
    requestMethod: 'post',

    // Interal attributes
    errors: null, // [{fileName: 'x', message: 'y'}, ...]
    totalSize: 0,
    uploadedSize: 0,
    uploadPercentage: 0,
    uploadUrls: null, // [{filename: 'x', url: 'y'}],

    // Private
    _defaultUploadUrl: '/images/upload/',
    _files: null,
    _uploadTrackers: null,

    // Closure actions
    onCancel() {},
    onComplete() {},
    onFailed() {},
    onStart() {},
    onUploadStart() {},
    onUploadFailure() {},
    onUploadSuccess() {},

    // Optional closure actions
    // validate(file) {}

    init() {
        this._super(...arguments);
        this.set('errors', []);
        this.set('uploadUrls', []);
        this._uploadTrackers = [];

        if (!this.paramsHash) {
            this.set('paramsHash', {purpose: 'image'});
        }

        this.set('imageExtensions', IMAGE_EXTENSIONS);
        this.set('imageMimeTypes', IMAGE_MIME_TYPES);
        this.set('iconExtensions', ICON_EXTENSIONS);
        this.set('iconMimeTypes', ICON_MIME_TYPES);
    },

    didReceiveAttrs() {
        this._super(...arguments);

        // set up any defaults
        if (!this.uploadUrl) {
            this.set('uploadUrl', this._defaultUploadUrl);
        }

        // if we have new files, validate and start an upload
        if (this.files?.length) {
            this._setFiles(this.files);
        }
    },

    actions: {
        registerFileInput(input) {
            this.fileInput = input;
        },

        triggerFileDialog() {
            if (!this.fileInput) {
                // eslint-disable-next-line
                console.error('When using uploader.triggerFileDialog you must call uploader.registerFileInput first');
                return;
            }

            this.fileInput.click();
        },

        setFiles(files, resetInput) {
            this._setFiles(files);

            if (resetInput) {
                this.fileInput = resetInput();
            }
        },

        cancel() {
            this._reset();
            this.onCancel();
        }
    },

    _setFiles(files) {
        this.set('files', files);

        if (files && files !== this._files) {
            if (this.get('_uploadFiles.isRunning')) {
                // eslint-disable-next-line
                console.error('Adding new files whilst an upload is in progress is not supported.');
            }

            this._files = files;

            // we cancel early if any file fails client-side validation
            if (this._validate()) {
                this._uploadFiles.perform(files);
            }
        }
    },

    _validate() {
        let files = this.files;
        let validate = this.validate || this._defaultValidator.bind(this);
        let ok = [];
        let errors = [];

        // NOTE: for...of loop results in a transpilation that errors in Edge,
        // once we drop IE11 support we should be able to use native for...of
        for (let i = 0; i < files.length; i += 1) {
            let file = files[i];
            let result = validate(file);
            if (result === true) {
                ok.push(file);
            } else {
                errors.push({fileName: file.name, message: result});
            }
        }

        if (isEmpty(errors)) {
            return true;
        }

        this.set('errors', errors);
        this.onFailed(errors);
        return false;
    },

    // we only check the file extension by default because IE doesn't always
    // expose the mime-type, we'll rely on the API for final validation
    _defaultValidator(file) {
        let extensions = this.extensions;
        let [, extension] = (/(?:\.([^.]+))?$/).exec(file.name);

        // if extensions is falsy exit early and accept all files
        if (!extensions) {
            return true;
        }

        if (!isArray(extensions)) {
            extensions = extensions.split(',');
        }

        if (!extension || extensions.indexOf(extension.toLowerCase()) === -1) {
            let validExtensions = `.${extensions.join(', .').toUpperCase()}`;
            return `The file type you uploaded is not supported. Please use ${validExtensions}`;
        }

        return true;
    },

    _uploadFiles: task(function* (files) {
        let uploads = [];

        this._reset();
        this.onStart(files);

        // NOTE: for...of loop results in a transpilation that errors in Edge,
        // once we drop IE11 support we should be able to use native for...of
        for (let i = 0; i < files.length; i += 1) {
            let file = files[i];
            let tracker = UploadTracker.create({file});

            this._uploadTrackers.pushObject(tracker);
            uploads.push(this._uploadFile.perform(tracker, file, i));
        }

        // populates this.errors and this.uploadUrls
        yield all(uploads);

        if (!isEmpty(this.errors)) {
            this.onFailed(this.errors);
        }

        this.onComplete(this.uploadUrls);
    }).drop(),

    // eslint-disable-next-line ghost/ember/order-in-components
    _uploadFile: task(function* (tracker, file, index) {
        let ajax = this.ajax;
        let formData = this._getFormData(file);
        let url = `${ghostPaths().apiRoot}${this.uploadUrl}`;
        let metadata = null;

        try {
            metadata = yield Promise.resolve(this.onUploadStart(file));

            let response = yield ajax[this.requestMethod](url, {
                data: formData,
                processData: false,
                contentType: false,
                dataType: 'text',
                xhr: () => {
                    let xhr = new window.XMLHttpRequest();

                    xhr.upload.addEventListener('progress', (event) => {
                        run(() => {
                            tracker.update(event);
                            this._updateProgress();
                        });
                    }, false);

                    return xhr;
                }
            });

            // force tracker progress to 100% in case we didn't get a final event,
            // eg. when using mirage
            tracker.update({loaded: file.size, total: file.size});
            this._updateProgress();

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

            let result = {
                url: responseUrl,
                fileName: file.name
            };

            this.uploadUrls[index] = result;
            this.onUploadSuccess(result, metadata);

            return true;
        } catch (error) {
            // grab custom error message if present
            let message = error.payload && error.payload.errors && error.payload.errors[0].message || '';
            let context = error.payload && error.payload.errors && error.payload.errors[0].context || '';

            // fall back to EmberData/ember-ajax default message for error type
            if (!message) {
                message = error.message;
            }

            let result = {
                message,
                context,
                fileName: file.name
            };

            // TODO: check for or expose known error types?
            this.errors.pushObject(result);
            this.onUploadFailure(result, metadata);
        }
    }).maxConcurrency(MAX_SIMULTANEOUS_UPLOADS).enqueue(),

    // NOTE: this is necessary because the API doesn't accept direct file uploads
    _getFormData(file) {
        let formData = new FormData();
        formData.append(this.paramName, file, file.name);

        Object.keys(this.paramsHash || {}).forEach((key) => {
            formData.append(key, this.paramsHash[key]);
        });

        return formData;
    },

    // TODO: this was needed because using CPs directly resulted in infrequent updates
    // - I think this was because updates were being wrapped up to save
    // computation but that hypothesis needs testing
    _updateProgress() {
        if (this.isDestroyed || this.isDestroying) {
            return;
        }

        let trackers = this._uploadTrackers;
        let totalSize = trackers.reduce((total, tracker) => total + tracker.get('total'), 0);
        let uploadedSize = trackers.reduce((total, tracker) => total + tracker.get('loaded'), 0);

        this.set('totalSize', totalSize);
        this.set('uploadedSize', uploadedSize);

        if (totalSize === 0 || uploadedSize === 0) {
            return;
        }

        let uploadPercentage = Math.round((uploadedSize / totalSize) * 100);
        this.set('uploadPercentage', uploadPercentage);
    },

    _reset() {
        this.set('errors', []);
        this.set('totalSize', 0);
        this.set('uploadedSize', 0);
        this.set('uploadPercentage', 0);
        this.set('uploadUrls', []);
        this._uploadTrackers = [];
    }
});
