import Component from '@glimmer/component';
import {A} from '@ember/array';
import {action} from '@ember/object';
import {isHostLimitError} from 'ghost-admin/services/ajax';
import {isInvalidError} from 'ember-ajax/errors';
import {inject as service} from '@ember/service';
import {task} from 'ember-concurrency';
import {tracked} from '@glimmer/tracking';

export default class NewCustomIntegrationModal extends Component {
    @service router;
    @service store;

    @tracked errorMessage;

    constructor() {
        super(...arguments);
        this.integration = this.store.createRecord('integration');
    }

    willDestroy() {
        super.willDestroy(...arguments);
        this.integration.rollbackAttributes();
    }

    @action
    updateName(inputEvent) {
        this.integration.set('name', inputEvent.target.value);
        this.integration.set('hasValidated', A());
        this.integration.errors.clear();
    }

    @task({drop: true})
    *createIntegrationTask() {
        try {
            const integration = yield this.integration.save();
            this.router.transitionTo('settings.integration', integration);
            return true;
        } catch (error) {
            // TODO: server-side validation errors should be serialized
            // properly so that errors are added to model.errors automatically
            if (error && isInvalidError(error)) {
                let [firstError] = error.payload.errors;
                let {message} = firstError;

                if (message && message.match(/name/i)) {
                    this.integration.errors.add('name', message);
                    this.integration.hasValidated.pushObject('name');
                    return;
                }
            }

            if (isHostLimitError(error)) {
                this.errorMessage = error.payload.errors[0].context;
                return;
            }

            // bubble up to the global error handler
            if (error) {
                throw error;
            }
        }
    }
}
