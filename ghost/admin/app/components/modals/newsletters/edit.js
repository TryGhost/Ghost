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
        try {
            yield this.args.data.newsletter.validate({});

            const newEmail = this.args.data.newsletter.senderEmail;

            const result = yield this.args.data.newsletter.save();

            if (result._meta?.sent_email_verification) {
                yield this.modals.open(ConfirmNewsletterEmailModal, {
                    newEmail,
                    currentEmail: this.args.data.newsletter.senderEmail
                });
            }

            this.args.data.afterSave?.(result);

            return result;
        } catch (e) {
            if (e === undefined) {
                // ensure task button shows failed state
                throw new Error('Validation failed');
            }

            throw e;
        }
    }
}
