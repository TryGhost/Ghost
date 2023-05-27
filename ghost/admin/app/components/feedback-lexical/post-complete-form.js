import Component from '@glimmer/component';
import {action} from '@ember/object';
import {tracked} from '@glimmer/tracking';

export default class FeedbackLexicalPostCompleteFormComponent extends Component {
    @tracked feedbackMessage = '';

    @action
    updateFeedbackMessage(event) {
        this.feedbackMessage = event.target.value;
    }

    @action
    resetFeedbackMessage() {
        this.feedbackMessage = '';
    }
}
