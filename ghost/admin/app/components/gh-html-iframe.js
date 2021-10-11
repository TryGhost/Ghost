import Component from '@glimmer/component';
import {action} from '@ember/object';

export default class GhHtmlIframeComponent extends Component {
    @action
    replaceIframeContents(iframe) {
        if (iframe) {
            iframe.contentWindow.document.open();
            iframe.contentWindow.document.write(this.args.html);
            iframe.contentWindow.document.close();
        }
    }
}
