import Component from '@glimmer/component';
import {action} from '@ember/object';
import {tracked} from '@glimmer/tracking';

export default class PublishFlowComplete extends Component {
    @tracked showFeedbackLexicalModal = false;

    @action
    openFeedbackLexical() {
        console.log(`open feedback`)
        this.showFeedbackLexicalModal = true;
    }

    @action
    closeFeedbackLexical() {
        this.showFeedbackLexicalModal = false;
    }
}
