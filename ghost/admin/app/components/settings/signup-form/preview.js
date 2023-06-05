import Component from '@glimmer/component';
import {action} from '@ember/object';
import {throttle} from '@ember/runloop';
import {tracked} from '@glimmer/tracking';

export default class Preview extends Component {
    // We have two iframes
    // When the HTML changes, the invisible iframe will get changed, once that one is fully loaded, it will become visible and the other iframe will be hidden

    @tracked
        iframes = [
            {element: null, html: '', loading: true},
            {element: null, html: '', loading: true}
        ];

    @tracked
        visibleIframeIndex = 0;

    get visibleHtml() {
        return this.iframes[this.visibleIframeIndex].html;
    }

    @action
    onLoad(index, event) {
        const iframe = this.iframes[index];
        if (!iframe) {
            return;
        }

        if (!iframe.element) {
            iframe.element = event.currentTarget;

            if (index === this.visibleIframeIndex) {
                this.updateContent(index);
            }
        } else {
            // Finished loading this iframe
            iframe.loading = false;
            this.visibleIframeIndex = index;
        }
    }

    @action onChangeHtml() {
        // Get next iframe
        throttle(this, this.throttledUpdate, 300, false);
    }

    throttledUpdate() {
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

        if (index === this.visibleIframeIndex && !iframe.loading) {
            return;
        }

        iframe.loading = true;
        const html = `<html><head><style>body, html {padding: 0; margin: 0;}</style></head><body>${this.args.html}</body></html>`;
        iframe.html = this.args.html;

        // Set the iframe's new HTML
        iframe.element.contentWindow.document.open();
        iframe.element.contentWindow.document.write(html);
        iframe.element.contentWindow.document.close();
    }
}
