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
    _supportedImportFields = [
        'email',
        'name',
        'note',
        'subscribed_to_emails',
        'stripe_customer_id',
        'complimentary_plan',
        'labels',
        'created_at'
    ];

    @tracked _mapping = {};

    constructor(mapping) {
        // NOTE: there are only 2 distinguishable fields that could be automatically matched, which is the reason why code is just simple assignments
        if (mapping) {
            this.set(mapping.email, 'email');
            this.set(mapping.stripe_customer_id, 'stripe_customer_id');
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

    labelText: 'Select or drag-and-drop a CSV File',

    dragClass: null,
    file: null,
    fileData: null,
    mapping: null,
    paramName: 'membersfile',
    validating: false,
    uploading: false,
    uploadPercentage: 0,
    importResponse: null,
    failureMessage: null,
    validationErrors: null,
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

        // TODO: remove "if" below once import validations are production ready
        if (this.config.get('enableDeveloperExperiments')) {
            if (this.mapping) {
                for (const key in this.mapping.mapping) {
                    if (this.mapping.get(key)){
                        // reversing mapping direction to match the structure accepted in the API
                        formData.append(`mapping[${this.mapping.get(key)}]`, key);
                    }
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

                // TODO: remove "if" below once import validations are production ready
                if (this.config.get('enableDeveloperExperiments')) {
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
                            }
                        },
                        error: (error) => {
                            this._validationFailed(error);
                        }
                    });
                }
            }
        },

        reset() {
            this.set('failureMessage', null);
            this.set('labels', {labels: []});
            this.set('file', null);
            this.set('fileData', null);
            this.set('mapping', null);
            this.set('validationErrors', null);
        },

        upload() {
            if (this.file) {
                this.generateRequest();
            }
        },

        continueImport() {
            this.set('validating', false);
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
        this.set('importResponse', importResponse.meta.stats);
        // invoke the passed in confirm action to refresh member data
        this.confirm();
    },

    _uploadFinished() {
        this.set('uploading', false);
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
