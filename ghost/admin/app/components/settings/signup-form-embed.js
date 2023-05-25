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

        // We need to fallback to name if slug is not set, because of newly created labels
        const labels = this.labels.map(l => l.slug || l.name).join(',');

        const options = {
            site: siteUrl,
            labels,
            color: this.settings.accentColor
        };

        if (this.style === 'all-in-one') {
            options.logo = this.settings.icon;
            options.title = this.settings.title;
            options.description = this.settings.description;
        }

        let dataOptionsString = '';
        for (const [key, value] of Object.entries(options)) {
            dataOptionsString += ` data-${key}="${escapeHtml(value)}"`;
        }

        return `<script src="${encodeURI(scriptUrl)}"${dataOptionsString}></script>`;
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
