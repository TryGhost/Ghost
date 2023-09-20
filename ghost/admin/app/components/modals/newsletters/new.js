import Component from '@glimmer/component';
import {action} from '@ember/object';
import {inject as service} from '@ember/service';
import {task} from 'ember-concurrency';
import {tracked} from '@glimmer/tracking';

export default class NewNewsletterModal extends Component {
    @service modals;
    @service store;

    @tracked optInExisting = this.args.data.newsletter.isNew;

    willDestroy() {
        super.willDestroy(...arguments);
        this.args.data.newsletter.rollbackAttributes();
    }

    @action
    onInput(property, event) {
        this.args.data.newsletter[property] = event.target.value;
    }

    @action
    saveViaKeyboard(event, responder) {
        responder.stopPropagation();
        event.preventDefault();

        this.saveTask.perform();
    }

    @action
    setOptInExisting(event) {
        this.optInExisting = event.target.value;
    }

    @action
    toggleOptInExisting() {
        this.optInExisting = !this.optInExisting;
    }

    @task
    *saveTask() {
        const newsletter = this.args.data.newsletter;
        try {
            yield newsletter.validate({});

            const result = yield newsletter.save({
                adapterOptions: {optInExisting: this.optInExisting}
            });

            // Re-fetch newsletter data to refresh counts
            yield this.store.query('newsletter', {include: 'count.active_members,count.posts', limit: 'all'});
            this.args.data.afterSave?.(result);

            return result;
        } catch (error) {
            if (error === undefined) {
                // Validation error
                return;
            }

            // Do we have an error that we can show inline?
            if (error.payload && error.payload.errors) {
                for (const payloadError of error.payload.errors) {
                    if (payloadError.type === 'ValidationError' && payloadError.property && (payloadError.context || payloadError.message)) {
                        // Context has a better error message for validation errors
                        newsletter.errors.add(payloadError.property, payloadError.context || payloadError.message);
                    }
                }
            }

            throw error;
        }
    }
}
