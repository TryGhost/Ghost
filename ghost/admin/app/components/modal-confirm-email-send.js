import ModalComponent from 'ghost-admin/components/modal-base';
import {task} from 'ember-concurrency';

export default ModalComponent.extend({
    errorMessage: null,

    // Allowed actions
    confirm: () => {},

    confirmAndCheckError: task(function* () {
        try {
            yield this.confirm();
            this.closeModal();
            return true;
        } catch (e) {
            // switch to "failed" state if email fails
            if (e && e.name === 'EmailFailedError') {
                this.set('errorMessage', e.message);
                return;
            }

            // close modal and continue with normal error handling if it was
            // a non-email-related error
            this.closeModal();
            if (e) {
                throw e;
            }
        }
    })
});
