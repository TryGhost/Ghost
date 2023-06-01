import Component from '@glimmer/component';
import {action} from '@ember/object';
import {inject} from 'ghost-admin/decorators/inject';
import {inject as service} from '@ember/service';
import {task} from 'ember-concurrency';
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

    get generatedCode() {
        const siteUrl = this.config.blogUrl;
        const scriptUrl = this.config.signupForm.url.replace('{version}', this.config.signupForm.version);

        const options = {
            site: siteUrl,
            'button-color': this.settings.accentColor
        };

        for (const [i, label] of this.labels.entries()) {
            options[`label-${i + 1}`] = label.name;
        }

        let style = 'height: 58px';

        if (this.style === 'all-in-one') {
            options.logo = this.settings.icon;
            options.title = this.settings.title;
            options.description = this.settings.description;
            options['background-color'] = '#f9f9f9';
            style = 'height: 60vh; min-height: 400px;';
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
