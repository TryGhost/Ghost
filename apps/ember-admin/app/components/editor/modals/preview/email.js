import Component from '@glimmer/component';
import validator from 'validator';
import {action} from '@ember/object';
import {htmlSafe} from '@ember/template';
import {inject} from 'ghost-admin/decorators/inject';
import {inject as service} from '@ember/service';
import {task, timeout} from 'ember-concurrency';
import {tracked} from '@glimmer/tracking';

const INJECTED_CSS = `
html {
    scrollbar-width: thin;
    scrollbar-color: rgba(0, 0, 0, 0.2) transparent;
}
html::-webkit-scrollbar {
    width: 8px;
    background: transparent;
}
html::-webkit-scrollbar-thumb {
    border-radius: 4px;
    background-color: rgba(0, 0, 0, 0.2);
}
html::-webkit-scrollbar-thumb:hover {
    background-color: rgba(0, 0, 0, 0.3);
}
`;

// TODO: remove duplication with <ModalPostEmailPreview>
export default class ModalPostPreviewEmailComponent extends Component {
    @service ajax;
    @service feature;
    @service ghostPaths;
    @service session;
    @service settings;
    @service store;

    @inject config;

    @tracked html = '';
    @tracked subject = '';
    @tracked previewEmailAddress = this.session.user.email;
    @tracked sendPreviewEmailError = '';
    @tracked newsletter = this.args.post.newsletter || this.args.newsletter;
    @tracked newslettersList;

    constructor() {
        super(...arguments);
        this.loadNewslettersTask.perform();
    }

    get mailgunIsEnabled() {
        return this.config.mailgunIsConfigured ||
            !!(this.settings.mailgunApiKey && this.settings.mailgunDomain && this.settings.mailgunBaseUrl);
    }

    // older backends only understand the deprecated memberSegment param;
    // remove the legacy branch when the previewByTier flag is GA
    get _audienceParams() {
        const {memberStatus, memberTier} = this.args;

        if (!this.feature.previewByTier) {
            return {memberSegment: memberStatus === 'paid' ? 'status:-free' : 'status:free'};
        }

        const params = {member_status: memberStatus};
        if (memberTier) {
            params.member_tier = memberTier;
        }
        return params;
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
    focusPreviewFrame(event) {
        const iframe = event?.target;
        const body = iframe?.contentDocument?.body;

        if (!body) {
            iframe?.contentWindow?.focus();
            return;
        }

        if (!body.hasAttribute('tabindex')) {
            body.setAttribute('tabindex', '-1');
        }

        body.focus({preventScroll: true});
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

            const url = this.ghostPaths.url.api('/email_previews/posts', resourceId);
            const data = {emails: [testEmail], newsletter: this.newsletter.slug, ...this._audienceParams};
            const options = {
                data,
                dataType: 'json'
            };

            yield this.ajax.post(url, options);
            return true;
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
        let {html, subject, newsletter} = this;
        let {post} = this.args;
        const {memberStatus, memberTier} = this.args;

        if (html && subject && memberStatus === this._lastMemberStatus && memberTier === this._lastMemberTier && newsletter.slug === this._lastNewsletterSlug) {
            return {html, subject};
        }

        this._lastMemberStatus = memberStatus;
        this._lastMemberTier = memberTier;
        this._lastNewsletterSlug = newsletter.slug;

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
            let url = new URL(this.ghostPaths.url.api('/email_previews/posts', post.id), window.location.href);
            for (const [param, value] of Object.entries(this._audienceParams)) {
                url.searchParams.set(param, value);
            }
            url.searchParams.set('newsletter', this.newsletter.slug);

            let response = await this.ajax.request(url.href);
            let [emailPreview] = response.email_previews;
            html = emailPreview.html;
            subject = emailPreview.subject;
        }

        // inject extra CSS so the preview behaves consistently inside the iframe
        let domParser = new DOMParser();
        let htmlDoc = domParser.parseFromString(html, 'text/html');
        let stylesheet = htmlDoc.querySelector('style');
        let originalCss = stylesheet.innerHTML;
        stylesheet.innerHTML = `${originalCss}\n\n${INJECTED_CSS}`;

        const doctype = new XMLSerializer().serializeToString(htmlDoc.doctype);
        html = doctype + htmlDoc.documentElement.outerHTML;

        this.html = html;
        this.subject = subject;
    }

    @task
    *loadNewslettersTask() {
        const newslettersList = yield this.store.query('newsletter', {filter: 'status:active'});

        this.newslettersList = newslettersList;
    }

    @action
    setNewsletter(newsletter) {
        this.newsletter = newsletter;

        if (this._previewIframe) {
            this.renderEmailPreview(this._previewIframe);
        }
    }
}
