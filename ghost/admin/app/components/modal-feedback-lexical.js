import Component from '@glimmer/component';
import {action} from '@ember/object';
import {inject as service} from '@ember/service';
import {task} from 'ember-concurrency';

export default class FeedbackLexicalModalComponent extends Component {
    @service modals;
    @service ajax;

    constructor(...args) {
        super(...args);
        this.feedbackMessage = this.args.feedbackMessage;
    }

    // not working?
    @action
    willDestroy() {
        super.willDestroy(...arguments);
        window.removeEventListener('keydown', this.handleKeyDown);
    }

    @action
    handleKeyDown(event) {
        if (event.key === 'Escape') {
            this.args.closeModal();
        }
    }

    @action
    closeModal() {
        this.args.closeModal();
    }

    @task({drop: true})
    *submitFeedback() {
        let url = `https://submit-form.com/us6uBWv8`;

        let response = yield this.ajax.post(url, {
            data: {
                message: this.feedbackMessage
            }
        });

        if (response.status < 200 || response.status >= 300) {
            throw new Error('api failed ' + response.status + ' ' + response.statusText);
        }
        
        // note: do we want to just do this.send('closeModal') here? or do we want to display a thanks message and close after a delay?

        return response;
    }
}