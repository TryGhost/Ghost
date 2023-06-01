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

export default class SignupFormEmbed extends Component {
    @service settings;
    @service feature;
    @tracked opened = false;
    @tracked style = 'all-in-one';
    @tracked labels = [];
    @tracked backgroundColor = '#f9f9f9';
    @inject config;
    @service notifications;

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

        let dataOptionsString = '';
        for (const [key, value] of Object.entries(options)) {
            dataOptionsString += ` data-${key}="${escapeHtml(value)}"`;
        }

        return `<div style="${escapeHtml(style)}"><script src="${encodeURI(scriptUrl)}"${dataOptionsString}></script></div>`;
    }

    @task
    *copyText() {
        // Copy this.generatedCode tp the clipboard
        const el = document.createElement('textarea');
        el.value = this.generatedCode;
        document.body.appendChild(el);
        el.select();
        document.execCommand('copy');
        document.body.removeChild(el);

        yield true;
        return true;
    }
}
