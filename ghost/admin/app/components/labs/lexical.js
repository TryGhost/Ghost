import Component from '@glimmer/component';
import {action} from '@ember/object';
import {tracked} from '@glimmer/tracking';

export default class LabsLexicalComponent extends Component {
    // - The feedback form UI is hidden by default
    // - Enabling “Lexical editor” doesn’t show the feedback form
    // - Disabling “Lexical editor” shows the feedback form below this lab item and user can send the feedback
    // - Refreshing the page or navigating to some other page and then back to Labs → the form is hidden again
    @tracked isFeedbackFormVisible = false;

    @action
    toggleFeedbackForm(event) {
        this.isFeedbackFormVisible = !event.target.checked;
    }
}
