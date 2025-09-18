import Component from '@glimmer/component';
import {action} from '@ember/object';

export default class ModalPostPreviewBrowserComponent extends Component {
    @action
    setupPreview() {
        // Set up escape handler when iframe loads
        this.escapeHandler = (e) => {
            if (e.key === 'Escape' && this.args.closeModal) {
                e.preventDefault();
                this.args.closeModal();
            }
        };

        // Add listener with capture to intercept before iframe traps it
        document.addEventListener('keydown', this.escapeHandler, true);
    }

    willDestroy() {
        super.willDestroy(...arguments);

        // Clean up the event listener
        if (this.escapeHandler) {
            document.removeEventListener('keydown', this.escapeHandler, true);
        }
    }
}