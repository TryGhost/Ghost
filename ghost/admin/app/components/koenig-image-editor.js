import Component from '@glimmer/component';
import {action} from '@ember/object';
import {inject} from 'ghost-admin/decorators/inject';
import {inject as service} from '@ember/service';
import {tracked} from '@glimmer/tracking';

export default class KoenigImageEditor extends Component {
    @service ajax;
    @service feature;
    @tracked scriptLoaded = !!window.pintura;

    @inject config;

    constructor() {
        super(...arguments);
        if (this.config.pintura?.js && !window.pintura) {
            const url = new URL(this.config.pintura.js);

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
        }

        if (this.config.pintura?.css) {
            // Check if the CSS file is already present in the document's head
            let cssLink = document.querySelector(`link[href="${this.config.pintura.css}"]`);
            if (cssLink) {
                this.cssLoaded = true;
            } else {
                let link = document.createElement('link');
                link.rel = 'stylesheet';
                link.type = 'text/css';
                link.href = this.config.pintura.css;
                link.onload = () => {
                    this.cssLoaded = true;
                };
                document.head.appendChild(link);
            }
        }
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
                ]
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
