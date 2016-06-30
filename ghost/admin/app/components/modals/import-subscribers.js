import computed from 'ember-computed';
import {invokeAction} from 'ember-invoke-action';
import ModalComponent from 'ghost-admin/components/modals/base';
import ghostPaths from 'ghost-admin/utils/ghost-paths';

export default ModalComponent.extend({
    labelText: 'Select or drag-and-drop a CSV File',

    response: null,
    closeDisabled: false,

    uploadUrl: computed(function () {
        return `${ghostPaths().apiRoot}/subscribers/csv/`;
    }),

    actions: {
        uploadStarted() {
            this.set('closeDisabled', true);
        },

        uploadFinished() {
            this.set('closeDisabled', false);
        },

        uploadSuccess(response) {
            this.set('response', response.meta.stats);
            // invoke the passed in confirm action
            invokeAction(this, 'confirm');
        },

        confirm() {
            // noop - we don't want the enter key doing anything
        },

        closeModal() {
            if (!this.get('closeDisabled')) {
                this._super(...arguments);
            }
        }
    }
});
