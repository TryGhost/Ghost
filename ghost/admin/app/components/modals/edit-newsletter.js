import Component from '@glimmer/component';
import {action} from '@ember/object';
import {task} from 'ember-concurrency';
import {tracked} from '@glimmer/tracking';

export default class EditNewsletterModal extends Component {
    static modalOptions = {
        className: 'fullscreen-modal-full-overlay fullscreen-modal-portal-settings'
    };

    @tracked tab = 'settings';

    willDestroy() {
        super.willDestroy(...arguments);
        this.args.data.newsletter.rollbackAttributes();
    }

    @action
    changeTab(tab) {
        this.tab = tab;
    }

    @action
    saveViaKeyboard(event, responder) {
        responder.stopPropagation();
        event.preventDefault();

        this.saveTask.perform();
    }

    @task
    *saveTask() {
        try {
            const result = yield this.args.data.newsletter.save();

            this.args.data.afterSave?.(result);

            return result;
        } catch (e) {
            if (e === undefined) {
                // validation error
                return false;
            }

            throw e;
        }
    }
}
