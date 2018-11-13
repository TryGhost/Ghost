import ModalComponent from 'ghost-admin/components/modal-base';
import Webhook from 'ghost-admin/models/webhook';
import {AVAILABLE_EVENTS} from 'ghost-admin/helpers/event-name';
import {alias} from '@ember/object/computed';
import {camelize} from '@ember/string';
import {inject as service} from '@ember/service';
import {task} from 'ember-concurrency';

export default ModalComponent.extend({
    config: service(),
    router: service(),

    availableEvents: null,
    error: null,
    buttonText: 'Save',
    successText: 'Saved',

    confirm() {},

    webhook: alias('model'),

    init() {
        this._super(...arguments);
        this.availableEvents = AVAILABLE_EVENTS;
    },

    didReceiveAttrs() {
        if (this.webhook.isNew) {
            this.set('buttonText', 'Create');
            this.set('successText', 'Created');
        }
    },

    actions: {
        selectEvent(value) {
            this.webhook.set('event', value);
            this.webhook.validate({property: 'event'});
        },

        confirm() {
            this.saveWebhook.perform();
        }
    },

    saveWebhook: task(function* () {
        this.set('error', null);

        try {
            let webhook = yield this.confirm();
            let integration = yield webhook.get('integration');
            this.router.transitionTo('settings.integration', integration);
        } catch (error) {
            // TODO: server-side validation errors should be serialized
            // properly so that errors are added to model.errors automatically
            if (error && error.payload && error.payload.errors) {
                let attrs = Array.from(Webhook.attributes.keys());

                error.payload.errors.forEach((error) => {
                    let {message, property = ''} = error;
                    property = camelize(property);

                    if (property && attrs.includes(property)) {
                        this.webhook.errors.add(property, message);
                        this.webhook.hasValidated.pushObject(property);
                    } else {
                        this.set('error', `Error: ${message}`);
                    }
                });

                return;
            }

            // bubble up to the global error handler
            if (error) {
                throw error;
            }
        }
    })
});
