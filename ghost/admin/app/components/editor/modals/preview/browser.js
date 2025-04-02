import Component from '@glimmer/component';
import {action} from '@ember/object';
import {inject as service} from '@ember/service';

export default class ModalPostPreviewBrowserComponent extends Component {
    @service dropdown;

    @action
    setupIframe(iframe) {
        if (!iframe) {
            return;
        }

        iframe.addEventListener('load', () => {
            const iframeDoc = iframe.contentWindow?.document;
            if (iframeDoc) {
                iframeDoc.removeEventListener('click', this.dropdown.closeDropdowns);
                iframeDoc.addEventListener('click', this.dropdown.closeDropdowns);
            }
        });
    }
} 