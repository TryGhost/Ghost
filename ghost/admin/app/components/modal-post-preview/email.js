import Component from '@glimmer/component';
import validator from 'validator';
import {action} from '@ember/object';
import {htmlSafe} from '@ember/template';
import {inject as service} from '@ember/service';
import {task} from 'ember-concurrency-decorators';
import {timeout} from 'ember-concurrency';
import {tracked} from '@glimmer/tracking';

const INJECTED_CSS = `
html::-webkit-scrollbar {
    display: none;
    width: 0;
    background: transparent
}
html {
    scrollbar-width: none;
}
`;

// TODO: remove duplication with <ModalPostEmailPreview>
export default class ModalPostPreviewEmailComponent extends Component {
    @service ajax;
    @service config;
    @service feature;
    @service ghostPaths;
    @service session;
    @service settings;

    @tracked html = '';
    @tracked subject = '';
    @tracked memberSegment = 'status:free';
    @tracked previewEmailAddress = this.session.user.email;
    @tracked sendPreviewEmailError = '';

    get mailgunIsEnabled() {
        return this.config.get('mailgunIsConfigured') ||
            !!(this.settings.get('mailgunApiKey') && this.settings.get('mailgunDomain') && this.settings.get('mailgunBaseUrl'));
    }

    @action
    async renderEmailPreview(iframe) {
        this._previewIframe = iframe;

        await this._fetchEmailData();
        // avoid timing issues when _fetchEmailData didn't perform any async ops
        await timeout(100);

        if (iframe) {
            iframe.contentWindow.document.open();
            iframe.contentWindow.document.write(this.html);
            iframe.contentWindow.document.close();
        }
    }

    @action
    changeMemberSegment(segment) {
        this.memberSegment = segment;

        if (this._previewIframe) {
            this.renderEmailPreview(this._previewIframe);
        }
    }

    @task({drop: true})
    *sendPreviewEmailTask() {
        try {
            const resourceId = this.args.post.id;
            const testEmail = this.previewEmailAddress.trim();

            if (!validator.isEmail(testEmail)) {
                this.sendPreviewEmailError = 'Please enter a valid email';
                return false;
            }
            if (!this.mailgunIsEnabled) {
                this.sendPreviewEmailError = 'Please verify your email settings';
                return false;
            }
            this.sendPreviewEmailError = '';

            const url = this.ghostPaths.url.api('/email_preview/posts', resourceId);
            const data = {emails: [testEmail], memberSegment: this.memberSegment};
            const options = {
                data,
                dataType: 'json'
            };

            return yield this.ajax.post(url, options);
        } catch (error) {
            if (error) {
                let message = 'Email could not be sent, verify mail settings';

                // grab custom error message if present
                if (
                    error.payload && error.payload.errors
                    && error.payload.errors[0] && error.payload.errors[0].message) {
                    message = htmlSafe(error.payload.errors[0].message);
                }

                this.sendPreviewEmailError = message;
                throw error;
            }
        }
    }

    async _fetchEmailData() {
        let {html, subject, memberSegment} = this;
        let {post} = this.args;

        if (html && subject && memberSegment === this._lastMemberSegment) {
            return {html, subject};
        }

        this._lastMemberSegment = memberSegment;

        // model is an email
        if (post.html && post.subject) {
            html = post.html;
            subject = post.subject;
        // model is a post with an existing email
        } else if (post.email) {
            html = post.email.html;
            subject = post.email.subject;
        // model is a post, fetch email preview
        } else {
            let url = this.ghostPaths.url.api('/email_preview/posts', post.id);
            if (this.feature.emailCardSegments) {
                url = `${url}?memberSegment=${encodeURIComponent(this.memberSegment)}`;
            }
            let response = await this.ajax.request(url);
            let [emailPreview] = response.email_previews;
            html = emailPreview.html;
            subject = emailPreview.subject;
        }

        // inject extra CSS into the html for disabling links and scrollbars etc
        let domParser = new DOMParser();
        let htmlDoc = domParser.parseFromString(html, 'text/html');
        let stylesheet = htmlDoc.querySelector('style');
        let originalCss = stylesheet.innerHTML;
        stylesheet.innerHTML = `${originalCss}\n\n${INJECTED_CSS}`;
        html = htmlDoc.documentElement.innerHTML;

        this.html = html;
        this.subject = subject;
    }
}
