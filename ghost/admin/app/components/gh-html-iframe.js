import Component from '@glimmer/component';
import {action} from '@ember/object';

export default class GhHtmlIframeComponent extends Component {
    iframe = null;

    @action
    registerIframe(iframe) {
        this.iframe = iframe;
    }

    @action
    replaceIframeContents(iframe, html) {
        if (this.iframe) {
            this.iframe.contentWindow.document.open();
            this.iframe.contentWindow.document.write(html);
            this.iframe.contentWindow.document.close();
        }
    }
}
