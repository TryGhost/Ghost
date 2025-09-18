/* global key */
import Component from '@glimmer/component';
import {action} from '@ember/object';
import {run} from '@ember/runloop';
import {inject as service} from '@ember/service';

export default class ModalPostPreviewBrowserComponent extends Component {
    @service modals;

    iframeElement = null;

    constructor() {
        super(...arguments);
        // Start listening for escape immediately
        this.setupGlobalEscapeHandler();
    }

    setupGlobalEscapeHandler() {
        // Create a single unified handler
        this.escapeHandler = (e) => {
            // Check if this component is still active and has the modal open
            if (!this.isDestroyed && !this.isDestroying) {
                if (e.key === 'Escape' || e.keyCode === 27 || e.which === 27) {
                    // Check if our modal is currently open
                    const modalElement = document.querySelector('.gh-post-preview-modal');
                    if (modalElement) {
                        e.preventDefault();
                        e.stopPropagation();
                        e.stopImmediatePropagation();

                        // Use run.next to ensure we're in the Ember run loop
                        run.next(this, () => {
                            this.closeModal();
                        });

                        return false;
                    }
                }
            }
        };

        // Add handler with maximum priority on multiple targets
        const options = {capture: true, passive: false};
        window.addEventListener('keydown', this.escapeHandler, options);
        window.addEventListener('keyup', this.escapeHandler, options);
        document.addEventListener('keydown', this.escapeHandler, options);
        document.addEventListener('keyup', this.escapeHandler, options);
    }

    @action
    setupPreview(event) {
        this.iframeElement = event.target;

        // Re-attach handlers to ensure they have priority
        this.reinforceEscapeHandler();

        // Try to inject into iframe as well
        setTimeout(() => {
            this.injectIframeHandler();
        }, 100);
    }

    reinforceEscapeHandler() {
        // Remove and re-add to ensure we're at the front of the queue
        const options = {capture: true, passive: false};

        window.removeEventListener('keydown', this.escapeHandler, options);
        document.removeEventListener('keydown', this.escapeHandler, options);

        window.addEventListener('keydown', this.escapeHandler, options);
        document.addEventListener('keydown', this.escapeHandler, options);

        // Also override keymaster if it exists
        if (typeof key !== 'undefined') {
            key.unbind('escape');
            key('escape', () => {
                this.closeModal();
                return false;
            });
        }
    }

    injectIframeHandler() {
        if (!this.iframeElement) {
            return;
        }

        try {
            const iframeDoc = this.iframeElement.contentDocument;
            const iframeWin = this.iframeElement.contentWindow;

            if (iframeDoc && iframeWin) {
                // Create handler for inside iframe
                const iframeEscapeHandler = (e) => {
                    if (e.key === 'Escape' || e.keyCode === 27) {
                        e.preventDefault();
                        e.stopPropagation();

                        // Trigger escape on parent window
                        const escapeEvent = new KeyboardEvent('keydown', {
                            key: 'Escape',
                            keyCode: 27,
                            which: 27,
                            code: 'Escape',
                            bubbles: true,
                            cancelable: true
                        });

                        window.dispatchEvent(escapeEvent);
                    }
                };

                // Add to iframe's window and document
                iframeWin.addEventListener('keydown', iframeEscapeHandler, true);
                iframeDoc.addEventListener('keydown', iframeEscapeHandler, true);

                // Store for cleanup
                this.iframeHandlers = {
                    win: iframeWin,
                    doc: iframeDoc,
                    handler: iframeEscapeHandler
                };
            }
        } catch (e) {
            // Ignore cross-origin errors
            console.debug('Could not inject iframe handler:', e.message);
        }
    }

    closeModal() {
        // Try multiple methods to close
        if (this.args.closeModal && typeof this.args.closeModal === 'function') {
            this.args.closeModal();
        } else if (this.modals && this.modals.top && this.modals.top.close) {
            this.modals.top.close();
        } else {
            // Last resort: find and click the close button
            const closeButton = document.querySelector('.gh-post-preview-modal button.gh-btn-editor') ||
                               document.querySelector('button[class*="close"]') ||
                               Array.from(document.querySelectorAll('button')).find(btn => btn.textContent.trim() === 'Close');
            if (closeButton) {
                closeButton.click();
            }
        }
    }

    willDestroy() {
        super.willDestroy(...arguments);

        // Clean up all event listeners
        const options = {capture: true, passive: false};

        if (this.escapeHandler) {
            window.removeEventListener('keydown', this.escapeHandler, options);
            window.removeEventListener('keyup', this.escapeHandler, options);
            document.removeEventListener('keydown', this.escapeHandler, options);
            document.removeEventListener('keyup', this.escapeHandler, options);
        }

        // Clean up iframe handlers
        if (this.iframeHandlers) {
            try {
                this.iframeHandlers.win.removeEventListener('keydown', this.iframeHandlers.handler, true);
                this.iframeHandlers.doc.removeEventListener('keydown', this.iframeHandlers.handler, true);
            } catch (e) {
                // Ignore
            }
        }

        // Restore keymaster if we modified it
        if (typeof key !== 'undefined') {
            key.unbind('escape');
        }
    }
}