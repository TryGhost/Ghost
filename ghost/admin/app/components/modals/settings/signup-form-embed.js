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
    @tracked backgroundColor = '#f9f9f9';
    @inject config;
    @service notifications;

    static modalOptions = {
        className: 'fullwidth-modal'
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
                value: '#f9f9f9',
                name: 'Light grey',
                class: '',
                style: 'background: #f9f9f9 !important;'
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
            'button-text-color': textColorForBackgroundColor(this.settings.accentColor).hex()
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
        for (const [key, value] of Object.entries(options)) {
            dataOptionsString += ` data-${key}="${escapeHtml(value)}"`;
        }

        const code = `<div style="${escapeHtml(style)}"><script src="${encodeURI(scriptUrl)}"${dataOptionsString}></script></div>`;

        if (preview && this.style === 'minimal') {
            // Add background
            return `<div style="position: absolute; z-index: -1; top: 0; left: 0; width: 100%; height: 100%; background-image: linear-gradient(45deg, #eee 25%, transparent 25%, transparent 75%, #eee 75%), linear-gradient(45deg, #eee 25%, transparent 25%, transparent 75%, #eee 75%);background-size: 16px 16px;background-position: 0 0, 8px 8px;;"></div>${code}`;
        }

        return code;
    }

    @task
    *copyText() {
        // Copy this.generatedCode tp the clipboard
        const el = document.getElementById('gh-signup-form-embed-code-input');
        el.select();
        document.execCommand('copy');
        this.notifications.showNotification('Code copied to clipboard!');

        yield true;
        return true;
    }
}
