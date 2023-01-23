import Component from '@glimmer/component';
import validator from 'validator';
import {action} from '@ember/object';
import {htmlSafe} from '@ember/template';
import {inject} from 'ghost-admin/decorators/inject';
import {inject as service} from '@ember/service';
import {task, timeout} from 'ember-concurrency';
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

const FREE_SEGMENT = 'status:free';
const PAID_SEGMENT = 'status:-free';

const SEGMENT_OPTIONS = [{
    name: 'Free member',
    value: FREE_SEGMENT
}, {
    name: 'Paid member',
    value: PAID_SEGMENT
}];

// TODO: remove duplication with <ModalPostEmailPreview>
export default class ModalPostPreviewEmailComponent extends Component {
    @service ajax;
    @service dropdown;
    @service feature;
    @service ghostPaths;
    @service session;
    @service settings;
    @service store;

    @inject config;

    @tracked html = '';
    @tracked subject = '';
    @tracked memberSegment = FREE_SEGMENT;
    @tracked previewEmailAddress = this.session.user.email;
    @tracked sendPreviewEmailError = '';
    @tracked newsletter = this.args.post.newsletter || this.args.newsletter;
    @tracked newslettersList;

    segments = SEGMENT_OPTIONS;

    constructor() {
        super(...arguments);
        this.loadNewslettersTask.perform();
    }

    get mailgunIsEnabled() {
        return this.config.mailgunIsConfigured ||
            !!(this.settings.mailgunApiKey && this.settings.mailgunDomain && this.settings.mailgunBaseUrl);
    }

    get paidMembersEnabled() {
        return this.settings.paidMembersEnabled;
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

            iframe.contentWindow.document.removeEventListener('click', this.dropdown.closeDropdowns);
            iframe.contentWindow.document.addEventListener('click', this.dropdown.closeDropdowns);
        }
    }

    get selectedSegment() {
        return this.segments.find(segment => segment.value === this.memberSegment);
    }

    @action
    setSegment(segment) {
        this.memberSegment = segment.value;

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

            const url = this.ghostPaths.url.api('/email_previews/posts', resourceId);
            const data = {emails: [testEmail], memberSegment: this.memberSegment, newsletter: this.newsletter.slug};
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
        let {html, subject, memberSegment, newsletter} = this;
        let {post} = this.args;

        if (html && subject && memberSegment === this._lastMemberSegment && newsletter.slug === this._lastNewsletterSlug) {
            return {html, subject};
        }

        this._lastMemberSegment = memberSegment;
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
            url.searchParams.set('memberSegment', this.memberSegment);
            url.searchParams.set('newsletter', this.newsletter.slug);

            let response = await this.ajax.request(url.href);
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
