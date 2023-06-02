import Component from '@glimmer/component';
import {action} from '@ember/object';
import {inject} from 'ghost-admin/decorators/inject';
import {inject as service} from '@ember/service';
import {task} from 'ember-concurrency';
import {textColorForBackgroundColor} from '@tryghost/color-utils';
import {tracked} from '@glimmer/tracking';

function escapeHtml(unsafe) {
    if (!unsafe) {
        return '';
    }
    return unsafe
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

export default class SignupFormEmbedModal extends Component {
    @service modals;
    @service settings;
    @service feature;
    @tracked style = 'all-in-one';
    @tracked labels = [];
    @tracked backgroundColor = '#F1F3F4';
    @inject config;

    static modalOptions = {
        className: 'fullwidth-modal gh-signup-form-embed'
    };

    @action
    setStyle(style) {
        this.style = style;
    }

    @action
    setLabels(labels) {
        this.labels = labels;
    }

    @action
    setBackgroundColor(backgroundColor) {
        this.backgroundColor = backgroundColor;
    }

    get backgroundPresetColors() {
        return [
            {
                value: '#F1F3F4',
                name: 'Light grey',
                class: '',
                style: 'background: #F1F3F4 !important;'
            },
            {
                value: '#000000',
                name: 'Black',
                class: '',
                style: 'background: #000000 !important;'
            }
        ];
    }

    get generatedCode() {
        return this.generateCode({preview: false});
    }

    get previewCode() {
        return this.generateCode({preview: true});
    }

    generateCode({preview}) {
        const siteUrl = this.config.blogUrl;
        const scriptUrl = this.config.signupForm.url.replace('{version}', this.config.signupForm.version);

        const options = {
            site: siteUrl,
            'button-color': this.settings.accentColor,
            'button-text-color': textColorForBackgroundColor(this.settings.accentColor).hex(),
            locale: this.settings.locale
        };

        for (const [i, label] of this.labels.entries()) {
            options[`label-${i + 1}`] = label.name;
        }

        let style = 'min-height: 58px';

        if (this.style === 'all-in-one') {
            options.logo = this.settings.icon;
            options.title = this.settings.title;
            options.description = this.settings.description;

            options['background-color'] = this.backgroundColor;
            options['text-color'] = textColorForBackgroundColor(this.backgroundColor).hex();

            style = 'height: 40vmin; min-height: 360px;';
        }

        if (preview) {
            if (this.style === 'minimal') {
                style = 'max-width: 500px;position: absolute; left: 50%; top:50%; transform: translate(-50%, -50%);';
            } else {
                style = 'height: 100vh';
            }
        }

        let dataOptionsString = '';
        const preferredOrder = [
            'background-color',
            'text-color',
            'button-color',
            'button-text-color',
            'title',
            'description',
            'logo',
            'site',
            'locale'
        ];
        const sortedKeys = Object.keys(options).sort((a, b) => {
            return preferredOrder.indexOf(a) - preferredOrder.indexOf(b);
        });
        for (const key of sortedKeys) {
            const value = options[key];
            dataOptionsString += ` data-${key}="${escapeHtml(value)}"`;
        }

        const code = `<div style="${escapeHtml(style)}"><script src="${encodeURI(scriptUrl)}"${dataOptionsString} async></script></div>`;

        if (preview && this.style === 'minimal') {
            // Add background
            return `<div style="position: absolute; z-index: -1; top: 0; left: 0; width: 100%; height: 100%; background-image: linear-gradient(45deg, #eee 25%, transparent 25%, transparent 75%, #eee 75%), linear-gradient(45deg, #eee 25%, transparent 25%, transparent 75%, #eee 75%);background-size: 16px 16px;background-position: 0 0, 8px 8px;;"></div>${code}`;
        }

        return code;
    }

    doCopy() {
        // Copy this.generatedCode tp the clipboard
        const el = document.getElementById('gh-signup-form-embed-code-input');
        el.select();
        document.execCommand('copy');
    }

    /**
     * Calling this task will make the button green, so avoid using if you don't want that
     */
    @task
    *copyText() {
        // Copy this.generatedCode tp the clipboard
        this.doCopy();

        yield true;
        return true;
    }

    @action
    copyTextOnMouseUp() {
        // Check if there is no current text selection anywhere on the page, otherwise skip copying
        // This is so users can still select text manually without copying automatically
        if (window.getSelection().toString() === '') {
            this.doCopy();
        }
    }
}
