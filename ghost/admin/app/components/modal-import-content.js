import ModalComponent from 'ghost-admin/components/modal-base';
import ghostPaths from 'ghost-admin/utils/ghost-paths';
import {computed} from '@ember/object';
import {inject} from 'ghost-admin/decorators/inject';
import {
    isRequestEntityTooLargeError,
    isUnsupportedMediaTypeError,
    isVersionMismatchError
} from 'ghost-admin/services/ajax';
import {inject as service} from '@ember/service';

export default ModalComponent.extend({
    ajax: service(),
    notifications: service(),
    store: service(),

    state: 'INIT',

    file: null,
    paramName: 'importfile',
    importResponse: null,
    errorMessage: null,
    errorHeader: null,
    showTryAgainButton: true,

    // Allowed actions
    confirm: () => {},

    config: inject(),

    uploadUrl: computed(function () {
        return `${ghostPaths().apiRoot}/db/importFile`;
    }),

    formData: computed('file', function () {
        let formData = new FormData();

        formData.append(this.paramName, this.file);

        if (this.mappingResult.labels) {
            this.mappingResult.labels.forEach((label) => {
                formData.append('labels', label.name);
            });
        }

        if (this.mappingResult.mapping) {
            let mapping = this.mappingResult.mapping.toJSON();
            for (let [key, val] of Object.entries(mapping)) {
                formData.append(`mapping[${key}]`, val);
            }
        }

        return formData;
    }),

    actions: {
        setFile(file) {
            this.set('file', file);
            this.generateRequest();
        },

        reset() {
            this.set('errorMessage', null);
            this.set('errorHeader', null);
            this.set('file', null);
            this.set('state', 'INIT');
            this.set('showTryAgainButton', true);
        },

        closeModal() {
            if (this.state !== 'UPLOADING') {
                this._super(...arguments);
            }
        },

        // noop - we don't want the enter key doing anything
        confirm() {}
    },

    generateRequest() {
        let ajax = this.ajax;
        let formData = this.formData;
        let url = this.uploadUrl;

        this.set('state', 'UPLOADING');
        ajax.post(url, {
            data: formData,
            processData: false,
            contentType: false,
            dataType: 'text'
        }).then(() => {
            this.set('state', 'PROCESSING');
        }).catch((error) => {
            this._uploadError(error);
            this.set('state', 'ERROR');
        });
    },

    _uploadError(error) {
        let message;
        let header = 'Import error';

        if (isVersionMismatchError(error)) {
            this.notifications.showAPIError(error);
        }

        if (isUnsupportedMediaTypeError(error)) {
            message = 'The file type you uploaded is not supported.';
        } else if (isRequestEntityTooLargeError(error)) {
            message = 'The file you uploaded was larger than the maximum file size your server allows.';
        } else {
            console.error(error); // eslint-disable-line
            message = 'Something went wrong :(';
        }

        this.set('errorMessage', message);
        this.set('errorHeader', header);
    }
});
