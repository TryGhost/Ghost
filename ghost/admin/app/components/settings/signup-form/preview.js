import Component from '@glimmer/component';
import {action} from '@ember/object';
import {throttle} from '@ember/runloop';
import {tracked} from '@glimmer/tracking';

export default class Preview extends Component {
    // We have two iframes
    // When the HTML changes, the invisible iframe will get changed, once that one is fully loaded, it will become visible and the other iframe will be hidden

    @tracked
        iframes = [
            {element: null, html: '', loading: false, style: ''},
            {element: null, html: '', loading: false, style: ''}
        ];

    @tracked
        visibleIframeIndex = 0;

    lastChange = new Date();

    get visibleHtml() {
        return this.iframes[this.visibleIframeIndex].html;
    }

    get firstIframeStyle() {
        return this.iframes[0].style;
    }

    get secondIframeStyle() {
        return this.iframes[1].style;
    }

    @action
    onLoad(index, event) {
        const iframe = this.iframes[index];
        if (!iframe) {
            return;
        }

        if (iframe.timer) {
            clearTimeout(iframe.timer);
            iframe.timer = null;
        }

        if (!iframe.element) {
            iframe.element = event.currentTarget;

            if (index === this.visibleIframeIndex) {
                setTimeout(() => {
                    this.updateContent(index);
                });
            }
        } else {
            if (!iframe.loading) {
                return;
            }
            // We need to wait until the iframe is fully rendered. The onLoad is kinda okay in Chrome, but on Safari it is fired too early
            // So we need to poll if needed
            // Check if this iframe element has an iframe inside of the body
            // If so, we need to wait for that iframe to load as well
            const iframeElement = iframe.element.contentWindow.document.querySelector('iframe');

            // Check that iframe contains a non empty body
            const hasChildren = iframeElement && iframeElement.contentWindow.document.body && iframeElement.contentWindow.document.body.children.length > 0;

            if (hasChildren) {
                // Finished loading this iframe
                this.visibleIframeIndex = index;

                // Force tracked update
                this.iframes = [...this.iframes];
                iframe.loading = false;
            } else {
                // Wait 50ms
                iframe.timer = setTimeout(() => {
                    this.onLoad(index, event);
                }, 50);
            }
        }
    }

    @action onChangeHtml() {
        // Check if no loading iframes
        if (!this.iframes[0].loading && !this.iframes[1].loading && this.lastChange < new Date() - 500) {
            // We make it feel more responsive by updating the frame immediately, but only if the last change was more than 500ms ago
            // otherwise we get a lot of flickering

            this.lastChange = new Date();
            this.throttledUpdate();
            return;
        }

        // Only update the iframe after 400ms, with 400ms in between
        this.lastChange = new Date();
        throttle(this, this.throttledUpdate, 400, false);
    }

    throttledUpdate() {
        const currentVisibleHtml = this.iframes[this.visibleIframeIndex].html;
        if (currentVisibleHtml === this.args.html) {
            return;
        }

        // Update the invisible iframe content
        const index = this.visibleIframeIndex === 0 ? 1 : 0;
        this.updateContent(index);
    }

    @action
    updateContent(index) {
        const iframe = this.iframes[index];
        if (!iframe || !iframe.element) {
            return;
        }

        if (iframe.timer) {
            clearTimeout(iframe.timer);
            iframe.timer = null;
        }

        iframe.loading = true;
        const html = `<html><head><style>body, html {padding: 0; margin: 0; overflow: hidden;}</style></head><body>${this.args.html}</body></html>`;
        iframe.html = this.args.html;
        iframe.style = this.args.style;

        // Set the iframe's new HTML
        iframe.element.contentWindow.document.open();
        iframe.element.contentWindow.document.write(html);
        iframe.element.contentWindow.document.close();

        // Force tracked update
        this.iframes = [...this.iframes];
    }
}
