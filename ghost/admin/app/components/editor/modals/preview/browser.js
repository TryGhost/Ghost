import Component from '@glimmer/component';
import {action} from '@ember/object';

export default class ModalPostPreviewBrowserComponent extends Component {
    @action
    setupIframe(event) {
        const iframe = event.target;

        // Add keydown event listener to the iframe's contentWindow
        iframe.contentWindow.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                // Prevent the default behavior in the iframe
                e.preventDefault();
                e.stopPropagation();

                // Create and dispatch a new ESC key event to the parent window
                const escEvent = new KeyboardEvent('keydown', {
                    key: 'Escape',
                    code: 'Escape',
                    keyCode: 27,
                    which: 27,
                    bubbles: true,
                    cancelable: true,
                    composed: true
                });

                // Dispatch the event on the document instead of window
                document.dispatchEvent(escEvent);
            }
        });
    }
}
