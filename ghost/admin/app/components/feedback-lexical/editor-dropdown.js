import Component from '@glimmer/component';
import {action} from '@ember/object';
import {tracked} from '@glimmer/tracking';

export default class FeedbackLexicalEditorFormComponent extends Component {
    @tracked feedbackMessage = '';

    eventType = 'close';

    @action
    updateFeedbackMessage(event) {
        this.feedbackMessage = event.target.value;
    }

    @action
    onSent(dropdown) {
        dropdown.actions.close(this.eventType);
        this.feedbackMessage = '';
    }

    @action
    onCancel(dropdown) {
        dropdown.actions.close(this.eventType);
    }

    @action
    onClose(dropdown, event) {
        // Need this logic to disable dropdown closing on clicking outside https://ember-basic-dropdown.com/docs/dropdown-events
        // Close if the message was sent or Cancel button clicked
        if (event === this.eventType) {
            return true;
        }

        // Close if trigger button was clicked
        if (event?.target?.dataset?.trigger) {
            return true;
        }

        // Leave dropdown open for all other events
        return false;
    }
}
