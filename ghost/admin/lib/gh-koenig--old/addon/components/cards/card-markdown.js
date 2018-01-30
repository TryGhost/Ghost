import Component from '@ember/component';
import counter from 'ghost-admin/utils/word-count';
import formatMarkdown from 'ghost-admin/utils/format-markdown';
import layout from '../../templates/components/card-markdown';
import {
    UnsupportedMediaTypeError,
    isRequestEntityTooLargeError,
    isUnsupportedMediaTypeError,
    isVersionMismatchError
} from 'ghost-admin/services/ajax';
import {computed} from '@ember/object';
import {invokeAction} from 'ember-invoke-action';
import {isBlank} from '@ember/utils';
import {isArray as isEmberArray} from '@ember/array';
import {observer} from '@ember/object';
import {run} from '@ember/runloop';
import {inject as service} from '@ember/service';
/* legacyConverter.makeHtml(_.toString(this.get('markdown'))) */

export default Component.extend({
    ajax: service(),

    layout,
    accept: 'image/gif,image/jpg,image/jpeg,image/png,image/svg+xml',
    extensions: null,

    preview: computed('value', function () {
        return formatMarkdown(this.get('payload').markdown);
    }),

    // TODO: remove observer
    // eslint-disable-next-line ghost/ember/no-observers
    save: observer('doSave', function () {
        let payload = this.get('payload');
        payload.markdown = this.$('textarea').val();
        payload.wordcount = counter(payload.markdown);
        this.set('value', this.$('textarea').val());
        this.set('payload', payload);
        this.get('env').save(payload, false);
    }),

    init() {
        this._super(...arguments);
        this.extensions = ['gif', 'jpg', 'jpeg', 'png', 'svg'];
        this.set('value', this.get('payload').markdown);
    },

    didReceiveAttrs() {
        if (!this.get('isEditing')) {
            this.set('preview', formatMarkdown(this.get('payload').markdown));
        } else {
            run.next(() => {
                this.$('textarea').focus();
            });
        }
    },

    actions: {
        fileSelected(fileList) {
            // can't use array destructuring here as FileList is not a strict
            // array and fails in Safari
            // eslint-disable-next-line ember-suave/prefer-destructuring
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

        reset() {
            this.set('file', null);
            this.set('uploadPercentage', 0);
        },

        saveUrl() {
            let url = this.get('url');
            invokeAction(this, 'update', url);
        },

        selectCard() {
            invokeAction(this, 'selectCard');
        },

        didDrop(event) {
            event.preventDefault();
            event.stopPropagation();
            // eslint-disable-next-line ember-suave/prefer-destructuring
            let el = this.$('textarea')[0]; // array destructuring here causes ember to throw an error about calling an Object as a Function

            let start = el.selectionStart;

            let end = el.selectionEnd;

            let {files} = event.dataTransfer;
            let combinedLength = 0;

            // eslint-disable-next-line ember-suave/prefer-destructuring
            let file = files[0]; // array destructuring here causes ember to throw an error about calling an Object as a Function
            let placeholderText = `\r\n![uploading:${file.name}]()\r\n`;
            el.value = el.value.substring(0, start) + placeholderText + el.value.substring(end, el.value.length);
            combinedLength += placeholderText.length;

            el.selectionStart = start;
            el.selectionEnd = end + combinedLength;

            this.send('fileSelected', event.dataTransfer.files);
        },

        didDragOver() {
            this.$('textarea').addClass('dragOver');
        },

        didDragLeave() {
            this.$('textarea').removeClass('dragOver');
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
        this.set('url', response.url);

        this.get('payload').img = response.url;
        this.get('env').save(this.get('payload'), false);

        this.send('saveUrl');
        this.send('reset');
        invokeAction(this, 'uploadSuccess', response);
        let placeholderText = `![uploading:${response.file.name}]()`;
        let imageText = `![](${response.url})`;
        // eslint-disable-next-line ember-suave/prefer-destructuring
        let el = this.$('textarea')[0]; // array destructuring on jquery causes ember to throw an error about calling an Object as a Function

        el.value = el.value.replace(placeholderText, imageText);

        let action = this.get('updateValue');
        if (action) {
            action();
        }
    },

    _validate(file) {
        if (this.get('validate')) {
            return invokeAction(this, 'validate', file);
        } else {
            return this._defaultValidator(file);
        }
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
        } else if (error.payload && error.payload.errors && !isBlank(error.payload.errors[0].message)) {
            message = error.payload.errors[0].message;
        } else {
            message = 'Something went wrong :(';
        }

        this.set('failureMessage', message);
        invokeAction(this, 'uploadFailed', error);
        alert('upload failed');
        // TODO: remove console.log
        // eslint-disable-next-line no-console
        console.log(error);
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
    },

    generateRequest() {
        let ajax = this.get('ajax');
        // let formData = this.get('formData');

        let file = this.get('file');
        let formData = new FormData();
        formData.append('uploadimage', file);

        let url = `${this.get('apiRoot')}/uploads/`;
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

                // TODO: remove console.logs
                /* eslint-disable no-console */
                xhr.addEventListener('error', event => console.log('error', event));
                xhr.upload.addEventListener('error', event => console.log('errorupload', event));
                /* eslint-enabled no-console */

                return xhr;
            }
        }).then((response) => {
            let url = JSON.parse(response);
            this._uploadSuccess({file, url});
        }).catch((error) => {
            this._uploadFailed(error);
        }).finally(() => {
            this._uploadFinished();
        });
    }
});
