import ModalComponent from 'ghost-admin/components/modals/base';
import {A as emberA} from 'ember-array/utils';
import {isInvalidError} from 'ember-ajax/errors';
import {task} from 'ember-concurrency';

export default ModalComponent.extend({

    addSubscriber: task(function* () {
        try {
            yield this.get('confirm')();
            this.send('closeModal');
        } catch (error) {
            // TODO: server-side validation errors should be serialized
            // properly so that errors are added to model.errors automatically
            if (error && isInvalidError(error)) {
                let [firstError] = error.errors;
                let {message} = firstError;

                if (message && message.match(/email/i)) {
                    this.get('model.errors').add('email', message);
                    this.get('model.hasValidated').pushObject('email');
                    return;
                }
            }

            // route action so it should bubble up to the global error handler
            if (error) {
                throw error;
            }
        }
    }).drop(),

    actions: {
        updateEmail(newEmail) {
            this.set('model.email', newEmail);
            this.set('model.hasValidated', emberA());
            this.get('model.errors').clear();
        },

        confirm() {
            this.get('addSubscriber').perform();
        }
    }
});
