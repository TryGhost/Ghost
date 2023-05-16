import Component from '@glimmer/component';
import {action} from '@ember/object';
import {tracked} from '@glimmer/tracking';

export default class FeedbackLexicalEditorFormComponent extends Component {
    @tracked feedbackMessage = '';

    @action
    closeModal() {
        this.args.close();
    }

    @action
    updateFeedbackMessage(event) {
        this.feedbackMessage = event.target.value;
    }
}
