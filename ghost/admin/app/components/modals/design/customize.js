import Component from '@glimmer/component';
import config from 'ghost-admin/config/environment';
import {action} from '@ember/object';
import {run} from '@ember/runloop';
import {inject as service} from '@ember/service';
import {task} from 'ember-concurrency-decorators';
import {tracked} from '@glimmer/tracking';

export default class ModalsDesignCustomizeComponent extends Component {
    @service ajax;
    @service config;
    @service settings;
    @service store;

    @tracked tab = 'general';

    previewIframe = null;

    constructor() {
        super(...arguments);
        this.fetchThemeSettingsTask.perform();
    }

    get themeSettings() {
        return this.store.peekAll('custom-theme-setting');
    }

    @action
    changeTab(tab) {
        this.tab = tab;
    }

    @action
    registerPreviewIframe(iframe) {
        this.previewIframe = iframe;
        this.updatePreviewTask.perform();
    }

    @action
    replacePreviewContents(html) {
        if (this.previewIframe) {
            this.previewIframe.contentWindow.document.open();
            this.previewIframe.contentWindow.document.write(html);
            this.previewIframe.contentWindow.document.close();
        }
    }

    @task
    *fetchThemeSettingsTask() {
        // unload stored settings and re-load from API so they always match active theme
        // run is required here, see https://github.com/emberjs/data/issues/5447#issuecomment-845672812
        run(() => this.store.unloadAll('custom-theme-setting'));
        yield this.store.findAll('custom-theme-setting');
    }

    @task
    *updatePreviewTask() {
        // skip during testing because we don't have mocks for the front-end
        if (config.environment === 'test' || !this.previewIframe) {
            return;
        }

        // grab the preview html
        const ajaxOptions = {
            contentType: 'text/html;charset=utf-8',
            dataType: 'text',
            headers: {
                'x-ghost-preview': this.previewData
            }
        };

        // TODO: config.blogUrl always removes trailing slash - switch to always have trailing slash
        const frontendUrl = `${this.config.get('blogUrl')}/`;
        const previewContents = yield this.ajax.post(frontendUrl, ajaxOptions);

        // inject extra CSS to disable navigation and prevent clicks
        const injectedCss = `html { pointer-events: none; }`;

        const domParser = new DOMParser();
        const htmlDoc = domParser.parseFromString(previewContents, 'text/html');

        const stylesheet = htmlDoc.querySelector('style');
        const originalCSS = stylesheet.innerHTML;
        stylesheet.innerHTML = `${originalCSS}\n\n${injectedCss}`;

        // replace the iframe contents with the doctored preview html
        this.replacePreviewContents(htmlDoc.documentElement.innerHTML);
    }
}
