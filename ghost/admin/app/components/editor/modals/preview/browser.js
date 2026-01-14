import Component from '@glimmer/component';
import {action} from '@ember/object';

export default class ModalPostPreviewBrowserComponent extends Component {
    @action
    setupPreview(event) {
        // Get iframe from the event target
        const iframe = event.target;

        // Store iframe reference
        this.iframe = iframe;

        // Listen for messages from the iframe
        this.messageHandler = (messageEvent) => {
            // Check if message is from our iframe
            if (messageEvent.source === this.iframe?.contentWindow && messageEvent.data?.type === 'escapeKeyPressed') {
                // Create and dispatch a new keyboard event on the parent document
                // This ensures the modal service's handler will catch it
                const escapeEvent = new KeyboardEvent('keydown', {
                    key: 'Escape',
                    code: 'Escape',
                    keyCode: 27,
                    bubbles: true,
                    cancelable: true
                });
                document.dispatchEvent(escapeEvent);
            }
        };

        // Add message listener to parent window
        window.addEventListener('message', this.messageHandler);

        // Inject script into iframe to listen for escape key and post message
        // We need to wait a bit for the iframe document to be ready
        setTimeout(() => {
            if (this.iframe && this.iframe.contentWindow) {
                try {
                    // Check if the document is ready
                    const iframeDoc = this.iframe.contentWindow.document;
                    if (iframeDoc && iframeDoc.body) {
                        const script = iframeDoc.createElement('script');
                        // Add a data attribute to identify our injected script
                        script.setAttribute('data-ghost-preview-escape-handler', 'true');
                        script.innerHTML = `
                            (function() {
                                // Mark that the escape handler is ready
                                window.ghostPreviewEscapeHandlerReady = true;

                                // Listen for escape key and post message to parent
                                document.addEventListener('keydown', function(e) {
                                    if (e.key === 'Escape') {
                                        window.parent.postMessage({ type: 'escapeKeyPressed' }, '*');
                                    }
                                }, true);

                                // Also listen on window to catch all events
                                window.addEventListener('keydown', function(e) {
                                    if (e.key === 'Escape') {
                                        window.parent.postMessage({ type: 'escapeKeyPressed' }, '*');
                                    }
                                }, true);
                            })();
                        `;
                        iframeDoc.body.appendChild(script);
                    }
                } catch (e) {
                    // Cross-origin or other access issues, ignore
                }
            }
        }, 500); // Wait for iframe content to fully load
    }

    willDestroy() {
        super.willDestroy(...arguments);

        // Clean up the message listener
        if (this.messageHandler) {
            window.removeEventListener('message', this.messageHandler);
        }
    }
}