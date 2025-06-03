import Component from '@glimmer/component';
import {action} from '@ember/object';

export default class ModalPostPreviewBrowserComponent extends Component {
    escapePressHandler = null;
    
    @action
    setupPreview() {
        // Set up a handler on the document
        this.escapePressHandler = (e) => {
            if (e.key === 'Escape') {
                // Only handle if we have a modal to close
                if (this.args.closeModal) {
                    // Prevent the default behavior
                    e.preventDefault();
                    e.stopPropagation();

                    // Close the modal directly without creating a new event
                    this.args.closeModal();
                }
            }
        };
    }
}