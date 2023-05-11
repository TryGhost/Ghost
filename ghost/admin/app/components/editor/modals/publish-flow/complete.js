import Component from '@glimmer/component';
import FeedbackLexicalModal from '../../../modal-feedback-lexical';
import {action} from '@ember/object';
import {inject as service} from '@ember/service';
import {tracked} from '@glimmer/tracking';

export default class PublishFlowComplete extends Component {
    @service modals;

    @tracked showFeedbackLexicalModal = false;

    @action
    async openFeedbackLexical() {
        await this.modals.open(FeedbackLexicalModal, {post: this.args.publishOptions.post});
    }
}