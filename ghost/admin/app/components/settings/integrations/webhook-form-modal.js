import Component from '@glimmer/component';
import Webhook from 'ghost-admin/models/webhook';
import {AVAILABLE_EVENTS} from 'ghost-admin/helpers/event-name';
import {action} from '@ember/object';
import {camelize} from '@ember/string';
import {inject as service} from '@ember/service';
import {task} from 'ember-concurrency';
import {tracked} from '@glimmer/tracking';

export default class WebhookFormModal extends Component {
    @service notifications;
    @service router;

    availableEvents = AVAILABLE_EVENTS;
    buttonText = this.args.data.webhook.isNew ? 'Create' : 'Save';
    successText = this.args.data.webhook.isNew ? 'Created' : 'Saved';

    @tracked error = null;

    get webhook() {
        return this.args.data.webhook;
    }

    @action
    setProperty(property, event) {
        this.webhook[property] = event.target.value;
    }

    @action
    selectEvent(value) {
        this.webhook.event = value;
        this.webhook.validate({property: 'event'});
    }

    @action
    validate(property) {
        return this.webhook.validate({property});
    }

    @action
    noop(event) {
        event.preventDefault();
    }

    @task({drop: true})
    *saveWebhookTask() {
        this.error = null;

        try {
            const webhook = yield this.webhook.save();
            const integration = yield webhook.integration;
            this.router.transitionTo('settings.integration', integration);
            return true;
        } catch (e) {
            // TODO: server-side validation errors should be serialized
            // properly so that errors are added to model.errors automatically
            if (e && e.payload && e.payload.errors) {
                const attrs = Array.from(Webhook.attributes.keys());

                e.payload.errors.forEach((error) => {
                    let {message, property = ''} = error;
                    property = camelize(property);

                    if (property && attrs.includes(property)) {
                        this.webhook.errors.add(property, message);
                        this.webhook.hasValidated.pushObject(property);
                    } else {
                        this.error = `Error: ${message}`;
                    }
                });

                return;
            }

            // bubble up to the global error handler
            if (e) {
                throw e;
            }
        }
    }
}
