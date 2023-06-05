import Component from '@glimmer/component';
import {action} from '@ember/object';
import {tracked} from '@glimmer/tracking';

export default class Preview extends Component {
    iframe;
    iframeRoot;
    isContentLoaded = false;

    /**
     * When updating the frame, to avoid layout jumps, we'll reuse the last known height
     */
    @tracked
        cachedHeight = 0;

    @action
    onLoad(event) {
        this.iframe = event.currentTarget;
        if (!this.isContentLoaded) {
            this.updateContent();
        }
        this.onResize();
        (new ResizeObserver(() => this.onResize(this.iframeRoot)))?.observe?.(this.iframeRoot);
    }

    @action
    updateContent() {
        if (!this.iframe) {
            return;
        }
        const html = `<html><head><style>body, html {padding: 0; margin: 0;}</style></head><body>${this.args.html}</body></html>`;

        // Set the iframe's new HTML
        this.iframe.contentWindow.document.open();
        this.iframe.contentWindow.document.write(html);
        this.iframe.contentWindow.document.close();

        this.iframeRoot = this.iframe.contentDocument.body;

        // fix for Safari causing the iframe load to inifite loop
        // Set the flag indicating the content has been loaded
        this.isContentLoaded = true;
    }

    @action
    onResize() {
        if (!this.iframeRoot) {
            return;
        }

        const height = this.iframeRoot.scrollHeight || this.cachedHeight;

        //this.iframe.style.height = `${height}px`;

        if (height > 30) {
            this.cachedHeight = height;
        }
    }
}
