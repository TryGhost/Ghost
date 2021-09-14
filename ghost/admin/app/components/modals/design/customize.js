import Component from '@glimmer/component';
import {action} from '@ember/object';
import {inject as service} from '@ember/service';

export default class ModalsDesignAdvancedComponent extends Component {
    @service config;
    @service settings;
    @service router;

    previewIframe = null;

    @action
    registerPreviewIframe(iframe) {
        this.previewIframe = iframe;
    }

    @action
    willClose() {
        this.router.transitionTo('settings.design');
    }
}
