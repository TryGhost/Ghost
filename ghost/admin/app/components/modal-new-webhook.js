import ModalComponent from 'ghost-admin/components/modal-base';
import Webhook from 'ghost-admin/models/webhook';
import {alias} from '@ember/object/computed';
import {camelize} from '@ember/string';
import {isInvalidError} from 'ember-ajax/errors';
import {inject as service} from '@ember/service';
import {task} from 'ember-concurrency';

export default ModalComponent.extend({
    router: service(),

    availableEvents: null,

    confirm() {},

    webhook: alias('model'),

    init() {
        this._super(...arguments);
        this.availableEvents = [
            {event: 'site.changed', name: 'Site Changed (rebuild)'},
            {event: 'subscriber.added', name: 'Subscriber Added'},
            {event: 'subscriber.deleted', name: 'Subscriber Deleted'}
        ];
    },

    actions: {
        selectEvent(value) {
            this.webhook.set('event', value);
            this.webhook.validate({property: 'event'});
        },

        confirm() {
            this.createWebhook.perform();
        }
    },

    createWebhook: task(function* () {
        try {
            let webhook = yield this.confirm();
            let integration = yield webhook.get('integration');
            this.router.transitionTo('settings.integration', integration);
        } catch (error) {
            // TODO: server-side validation errors should be serialized
            // properly so that errors are added to model.errors automatically
            if (error && isInvalidError(error)) {
                let attrs = Array.from(Webhook.attributes.keys());

                error.payload.errors.forEach((error) => {
                    let {message, property} = error;
                    property = camelize(property);

                    if (property && attrs.includes(property)) {
                        this.webhook.errors.add(property, message);
                        this.webhook.hasValidated.pushObject(property);
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
