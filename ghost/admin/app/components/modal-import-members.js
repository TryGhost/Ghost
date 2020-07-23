import ModalComponent from 'ghost-admin/components/modal-base';
import ghostPaths from 'ghost-admin/utils/ghost-paths';
import papaparse from 'papaparse';
import {
    UnsupportedMediaTypeError,
    isRequestEntityTooLargeError,
    isUnsupportedMediaTypeError,
    isVersionMismatchError
} from 'ghost-admin/services/ajax';
import {computed} from '@ember/object';
import {htmlSafe} from '@ember/string';
import {isBlank} from '@ember/utils';
import {run} from '@ember/runloop';
import {inject as service} from '@ember/service';
import {tracked} from '@glimmer/tracking';

class MembersFieldMapping {
    @tracked _mapping = {};

    constructor(mapping) {
        if (mapping) {
            for (const [key, value] of Object.entries(mapping)) {
                this.set(value, key);
            }
        }
    }

    set(key, value) {
        this._mapping[key] = value;

        // trigger an update
        // eslint-disable-next-line no-self-assign
        this._mapping = this._mapping;
    }

    get(key) {
        return this._mapping[key];
    }

    get mapping() {
        return this._mapping;
    }

    getKeyByValue(searchedValue) {
        for (const [key, value] of Object.entries(this._mapping)) {
            if (value === searchedValue) {
                return key;
            }
        }

        return null;
    }

    updateMapping(from, to) {
        for (const key in this._mapping) {
            if (this.get(key) === to) {
                this.set(key, null);
            }
        }

        this.set(from, to);
    }
}

export default ModalComponent.extend({
    config: service(),
    ajax: service(),
    notifications: service(),
    memberImportValidator: service(),
    store: service(),

    labelText: 'Select or drop a CSV file',

    // import stages, default is "CSV file selection"
    validating: false,
    customizing: false,
    uploading: false,
    summary: false,

    dragClass: null,
    file: null,
    fileData: null,
    mapping: null,
    paramName: 'membersfile',
    uploadPercentage: 0,
    importResponse: null,
    failureMessage: null,
    validationErrors: null,
    uploadErrors: null,
    labels: null,

    // Allowed actions
    confirm: () => {},

    filePresent: computed.reads('file'),
    closeDisabled: computed.reads('uploading'),

    uploadUrl: computed(function () {
        return `${ghostPaths().apiRoot}/members/upload/`;
    }),

    importDisabled: computed('file', 'validationErrors', function () {
        const hasEmptyDataFile = this.validationErrors && this.validationErrors.filter(error => error.message.includes('File is empty')).length;
        return !this.file || !(this._validateFileType(this.file)) || hasEmptyDataFile;
    }),

    formData: computed('file', function () {
        let paramName = this.paramName;
        let file = this.file;
        let formData = new FormData();

        formData.append(paramName, file);

        if (this.labels.labels.length) {
            this.labels.labels.forEach((label) => {
                formData.append('labels', label.name);
            });
        }

        if (this.mapping) {
            for (const key in this.mapping.mapping) {
                if (this.mapping.get(key)){
                    // reversing mapping direction to match the structure accepted in the API
                    formData.append(`mapping[${this.mapping.get(key)}]`, key);
                }
            }
        }

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

    init() {
        this._super(...arguments);

        // NOTE: nested label come from specific "gh-member-label-input" parameters, would be good to refactor
        this.labels = {labels: []};
    },

    actions: {
        fileSelected(fileList) {
            let [file] = Array.from(fileList);
            let validationResult = this._validateFileType(file);

            if (validationResult !== true) {
                this._validationFailed(validationResult);
            } else {
                this.set('file', file);
                this.set('failureMessage', null);

                this.set('validating', true);

                papaparse.parse(file, {
                    header: true,
                    skipEmptyLines: true,
                    worker: true, // NOTE: compare speed and file sizes with/without this flag
                    complete: async (results) => {
                        this.set('fileData', results.data);

                        let {validationErrors, mapping} = await this.memberImportValidator.check(results.data);
                        this.set('mapping', new MembersFieldMapping(mapping));

                        if (validationErrors.length) {
                            this._importValidationFailed(validationErrors);
                        } else {
                            this.set('validating', false);
                            this.set('customizing', true);
                        }
                    },
                    error: (error) => {
                        this._validationFailed(error);
                    }
                });
            }
        },

        reset() {
            this.set('failureMessage', null);
            this.set('labels', {labels: []});
            this.set('file', null);
            this.set('fileData', null);
            this.set('mapping', null);
            this.set('validationErrors', null);
            this.set('uploadErrors', null);

            this.set('validating', false);
            this.set('customizing', false);
            this.set('uploading', false);
            this.set('summary', false);
        },

        upload() {
            if (this.file && this.mapping.getKeyByValue('email')) {
                this.generateRequest();
            } else {
                this.set('uploadErrors', [{
                    message: 'Import as "Email" value is missing.',
                    context: 'The CSV import has to have selected import as "Email" field.'
                }]);
            }
        },

        continueImport() {
            this.set('validating', false);
            this.set('customizing', true);
        },

        confirm() {
            // noop - we don't want the enter key doing anything
        },

        closeModal() {
            if (!this.closeDisabled) {
                this._super(...arguments);
            }
        },

        updateMapping(mapFrom, mapTo) {
            this.mapping.updateMapping(mapFrom, mapTo);
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
        let url = this.uploadUrl;

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
        }).then((importResponse) => {
            this._uploadSuccess(JSON.parse(importResponse));
        }).catch((error) => {
            this._validationFailed(error);
        }).finally(() => {
            this._uploadFinished();
        });
    },

    _uploadStarted() {
        this.set('customizing', false);
        this.set('uploading', true);
    },

    _uploadProgress(event) {
        if (event.lengthComputable) {
            run(() => {
                let percentage = Math.round((event.loaded / event.total) * 100);
                this.set('uploadPercentage', percentage);
            });
        }
    },

    _uploadSuccess(importResponse) {
        if (importResponse.meta.stats.invalid && importResponse.meta.stats.invalid.errors) {
            importResponse.meta.stats.invalid.errors.forEach((error) => {
                if (error.message === 'Value in [members.email] cannot be blank.') {
                    error.message = 'Missing email address';
                } else if (error.message === 'Validation (isEmail) failed for email') {
                    error.message = 'Invalid email address';
                }
            });
        }

        this.set('importResponse', importResponse.meta.stats);

        // insert auto-created import label into store immediately if present
        // ready for filtering the members list
        if (importResponse.meta.import_label) {
            this.store.pushPayload({
                labels: [importResponse.meta.import_label]
            });
        }

        // invoke the passed in confirm action to refresh member data
        this.confirm({label: importResponse.meta.import_label});
    },

    _uploadFinished() {
        this.set('uploading', false);
        this.set('summary', true);
    },

    _importValidationFailed(errors) {
        this.set('validationErrors', errors);
    },

    _validationFailed(error) {
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
            message = 'Something went wrong :(';
        }

        this.set('failureMessage', message);
    },

    _validateFileType(file) {
        let [, extension] = (/(?:\.([^.]+))?$/).exec(file.name);

        if (['csv'].indexOf(extension.toLowerCase()) === -1) {
            return new UnsupportedMediaTypeError();
        }

        return true;
    }
});
