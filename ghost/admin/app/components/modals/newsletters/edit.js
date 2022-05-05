import Component from '@glimmer/component';
import ConfirmNewsletterEmailModal from './confirm-newsletter-email';
import {action} from '@ember/object';
import {inject as service} from '@ember/service';
import {task} from 'ember-concurrency';
import {tracked} from '@glimmer/tracking';

export default class EditNewsletterModal extends Component {
    @service modals;

    static modalOptions = {
        className: 'fullscreen-modal-full-overlay fullscreen-modal-portal-settings'
    };

    @tracked openSection = null;

    willDestroy() {
        super.willDestroy(...arguments);
        this.args.data.newsletter.rollbackAttributes();
    }

    @action
    saveViaKeyboard(event, responder) {
        responder.stopPropagation();
        event.preventDefault();

        this.saveTask.perform();
    }

    @action
    toggleSection(section) {
        if (this.openSection === section) {
            this.openSection = null;
        } else {
            this.openSection = section;
        }
    }

    @action
    toggleSetting(property, event) {
        this.args.data.newsletter[property] = event.target.checked;
    }

    @task
    *saveTask() {
        const newsletter = this.args.data.newsletter;
        try {
            yield newsletter.validate({});

            const newEmail = newsletter.senderEmail;

            const result = yield newsletter.save({
                adapterOptions: {
                    include: 'count.members,count.posts'
                }
            });

            if (result._meta?.sent_email_verification) {
                yield this.modals.open(ConfirmNewsletterEmailModal, {
                    newEmail,
                    currentEmail: newsletter.senderEmail
                });
            }

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
