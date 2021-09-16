import Component from '@glimmer/component';
import {action} from '@ember/object';
import {inject as service} from '@ember/service';

export default class ModalsDesignAdvancedComponent extends Component {
    @service config;
    @service settings;

    previewIframe = null;

    @action
    registerPreviewIframe(iframe) {
        this.previewIframe = iframe;
    }
}
