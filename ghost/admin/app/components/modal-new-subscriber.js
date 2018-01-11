import ModalComponent from 'ghost-admin/components/modal-base';
import {alias} from '@ember/object/computed';
import {A as emberA} from '@ember/array';
import {isInvalidError} from 'ember-ajax/errors';
import {task} from 'ember-concurrency';

export default ModalComponent.extend({

    subscriber: alias('model'),

    actions: {
        updateEmail(newEmail) {
            this.set('subscriber.email', newEmail);
            this.set('subscriber.hasValidated', emberA());
            this.get('subscriber.errors').clear();
        },

        confirm() {
            this.get('addSubscriber').perform();
        }
    },

    addSubscriber: task(function* () {
        try {
            yield this.get('confirm')();
            this.send('closeModal');
        } catch (error) {
            // TODO: server-side validation errors should be serialized
            // properly so that errors are added to model.errors automatically
            if (error && isInvalidError(error)) {
                let [firstError] = error.payload.errors;
                let {message} = firstError;

                if (message && message.match(/email/i)) {
                    this.get('subscriber.errors').add('email', message);
                    this.get('subscriber.hasValidated').pushObject('email');
                    return;
                }
            }

            // route action so it should bubble up to the global error handler
            if (error) {
                throw error;
            }
        }
    }).drop()
});
