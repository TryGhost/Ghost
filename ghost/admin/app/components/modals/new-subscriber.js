import {A as emberA} from 'ember-array/utils';
import ModalComponent from 'ghost-admin/components/modals/base';

export default ModalComponent.extend({
    actions: {
        updateEmail(newEmail) {
            this.set('model.email', newEmail);
            this.set('model.hasValidated', emberA());
            this.get('model.errors').clear();
        },

        confirm() {
            let confirmAction = this.get('confirm');

            this.set('submitting', true);

            confirmAction().then(() => {
                this.send('closeModal');
            }).catch((error) => {
                // TODO: server-side validation errors should be serialized
                // properly so that errors are added to the model's errors
                // property
                if (error && error.isAdapterError) {
                    let [firstError] = error.errors;
                    let {message, errorType} = firstError;

                    if (errorType === 'ValidationError') {
                        if (message && message.match(/email/i)) {
                            this.get('model.errors').add('email', message);
                            this.get('model.hasValidated').pushObject('email');
                            return;
                        }
                    }
                }

                // this is a route action so it should bubble up to the global
                // error handler
                throw error;
            }).finally(() => {
                if (!this.get('isDestroying') && !this.get('isDestroyed')) {
                    this.set('submitting', false);
                }
            });
        }
    }
});
