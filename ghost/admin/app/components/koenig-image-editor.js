import Component from '@glimmer/component';
import {action} from '@ember/object';
import {inject} from 'ghost-admin/decorators/inject';
import {inject as service} from '@ember/service';
import {tracked} from '@glimmer/tracking';

export default class KoenigImageEditor extends Component {
    @service ajax;
    @service feature;
    @service ghostPaths;
    @tracked scriptLoaded = false;
    @tracked cssLoaded = false;

    @inject config;

    get isEditorEnabled() {
        return this.scriptLoaded && this.cssLoaded;
    }

    getImageEditorJSUrl() {
        if (!this.config.pintura?.js) {
            return null;
        }
        let importUrl = this.config.pintura.js;

        // load the script from admin root if relative
        if (importUrl.startsWith('/')) {
            importUrl = window.location.origin + this.ghostPaths.adminRoot.replace(/\/$/, '') + importUrl;
        }
        return importUrl;
    }

    getImageEditorCSSUrl() {
        if (!this.config.pintura?.css) {
            return null;
        }
        let cssImportUrl = this.config.pintura.css;

        // load the css from admin root if relative
        if (cssImportUrl.startsWith('/')) {
            cssImportUrl = window.location.origin + this.ghostPaths.adminRoot.replace(/\/$/, '') + cssImportUrl;
        }
        return cssImportUrl;
    }

    loadImageEditorJavascript() {
        const jsUrl = this.getImageEditorJSUrl();

        if (!jsUrl) {
            return;
        }

        if (window.pintura) {
            this.scriptLoaded = true;
            return;
        }

        try {
            const url = new URL(jsUrl);

            let importScriptPromise;

            if (url.protocol === 'http:') {
                importScriptPromise = import(`http://${url.host}${url.pathname}`);
            } else {
                importScriptPromise = import(`https://${url.host}${url.pathname}`);
            }

            importScriptPromise.then(() => {
                this.scriptLoaded = true;
            }).catch(() => {
                // log script loading failure
            });
        } catch (e) {
            // Log script loading error
        }
    }

    loadImageEditorCSS() {
        let cssUrl = this.getImageEditorCSSUrl();
        if (!cssUrl) {
            return;
        }

        try {
            // Check if the CSS file is already present in the document's head
            let cssLink = document.querySelector(`link[href="${cssUrl}"]`);
            if (cssLink) {
                this.cssLoaded = true;
            } else {
                let link = document.createElement('link');
                link.rel = 'stylesheet';
                link.type = 'text/css';
                link.href = cssUrl;
                link.onload = () => {
                    this.cssLoaded = true;
                };
                document.head.appendChild(link);
            }
        } catch (e) {
            // Log css loading error
        }
    }

    constructor() {
        super(...arguments);

        // Load the image editor script and css if not already loaded
        this.loadImageEditorJavascript();
        this.loadImageEditorCSS();
    }

    @action
    async handleClick() {
        if (window.pintura) {
            const editor = window.pintura.openDefaultEditor({
                src: this.args.imageSrc,
                util: 'crop',
                utils: [
                    'crop',
                    'filter',
                    'finetune',
                    'redact'
                ],
                locale: {
                    labelButtonExport: 'Save and close'
                }
            });

            editor.on('loaderror', () => {
                // TODO: log error message
            });

            editor.on('process', (result) => {
                // save edited image
                this.args.saveImage(result.dest);
            });
        }
    }
}
