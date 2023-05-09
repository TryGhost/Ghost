import Component from '@glimmer/component';
import {action} from '@ember/object';
import {inject as service} from '@ember/service';

export default class FeedbackLexicalModalComponent extends Component {
    @service modals;

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
}