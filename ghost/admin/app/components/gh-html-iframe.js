import Component from '@glimmer/component';
import {action} from '@ember/object';

export default class GhHtmlIframeComponent extends Component {
    iframes = [];
    renderedIframe = 0;
    toRenderIframe = 1;

    get hiddenIframeStyle() {
        return 'position: absolute; visibility: hidden; border: none;';
    }

    get visibleIframeStyle() {
        return 'border: none;';
    }

    @action
    replaceIframeContents() {
        const iframe = this.iframes[this.toRenderIframe];

        if (iframe && this.args.html) {
            iframe.contentWindow.document.open();
            iframe.contentWindow.document.write(this.args.html);
            iframe.contentWindow.document.close();

            // force swap of iframes after a set timeout to account for slower connections
            // so we display _something_ in the iframe even though it's still loading
            this.swapTimeout = setTimeout(() => {
                this.swapIframes(iframe);
            }, 500);
        }
    }

    @action
    registerIframe(iframe) {
        this.iframes.push(iframe);

        if (this.iframes.indexOf(iframe) === 0) {
            iframe.style = this.visibleIframeStyle;
            this.replaceIframeContents();
        }

        if (this.iframes.indexOf(iframe) === 1) {
            iframe.style = this.hiddenIframeStyle;
        }
    }

    @action
    didLoad(event) {
        if (this.isDestroyed || this.isDestroying) {
            return;
        }

        this.swapIframes(event.target);
    }

    swapIframes(renderedIframe) {
        if (this.isDestroyed || this.isDestroying) {
            return;
        }

        window.clearTimeout(this.swapTimeout);

        if (this.iframes.indexOf(renderedIframe) !== this.renderedIframe) {
            let newScrollTop = this.iframes[this.renderedIframe].contentDocument.body.scrollTop;

            if (this._lastPageId !== this.args.pageId) {
                newScrollTop = 0;
            }
            this._lastPageId = this.args.pageId;

            this.iframes[this.toRenderIframe].contentDocument.body.scrollTop = newScrollTop;
            this.iframes[this.toRenderIframe].style = this.visibleIframeStyle;
            this.renderedIframe = this.toRenderIframe;
            this.toRenderIframe = this.toRenderIframe === 0 ? 1 : 0;
            this.iframes[this.toRenderIframe].style = this.hiddenIframeStyle;
        }
    }
}
