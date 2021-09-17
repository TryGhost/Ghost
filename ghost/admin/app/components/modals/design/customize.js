import Component from '@glimmer/component';
import {action} from '@ember/object';
import {inject as service} from '@ember/service';
import {tracked} from '@glimmer/tracking';

export default class ModalsDesignCustomizeComponent extends Component {
    @service config;
    @service settings;

    @tracked tab = 'general';

    previewIframe = null;

    @action
    changeTab(tab) {
        this.tab = tab;
    }

    @action
    registerPreviewIframe(iframe) {
        this.previewIframe = iframe;
    }

    @action
    replacePreviewContents(html) {
        if (this.previewIframe) {
            this.previewIframe.contentWindow.document.open();
            this.previewIframe.contentWindow.document.write(html);
            this.previewIframe.contentWindow.document.close();
        }
    }
}
