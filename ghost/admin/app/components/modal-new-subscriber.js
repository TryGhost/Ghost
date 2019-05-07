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
            this.addSubscriber.perform();
        }
    },

    addSubscriber: task(function* () {
        try {
            yield this.confirm();
            this.send('closeModal');
        } catch (error) {
            // TODO: server-side validation errors should be serialized
            // properly so that errors are added to model.errors automatically
            if (error && isInvalidError(error)) {
                let [firstError] = error.payload.errors;
                let {context} = firstError;

                if (context && context.match(/email/i)) {
                    this.get('subscriber.errors').add('email', context);
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
