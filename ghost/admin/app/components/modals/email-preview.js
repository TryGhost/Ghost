import Component from '@glimmer/component';
import {action} from '@ember/object';
import {inject as service} from '@ember/service';
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

export default class EmailPreviewModal extends Component {
    @service ajax;
    @service config;
    @service ghostPaths;
    @service settings;
    @service store;

    static modalOptions = {
        className: 'fullscreen-modal-full-overlay fullscreen-modal-email-preview'
    };

    @tracked tab = 'desktop';
    @tracked subject = null;
    @tracked newsletter = null;

    // cached to avoid re-fetching when changing tabs
    html = null;

    @action
    changeTab(tab) {
        this.tab = tab;
    }

    @action
    async renderEmailPreview(iframe) {
        await this._fetchEmailData();
        // avoid timing issues when _fetchEmailData didn't perform any async ops
        await timeout(100);

        if (iframe) {
            iframe.contentWindow.document.open();
            iframe.contentWindow.document.write(this.html);
            iframe.contentWindow.document.close();
        }
    }

    async _fetchEmailData() {
        let {html, subject} = this;

        // Fetch newsletter
        if (!this.newsletter && this.args.data.newsletter) {
            this.newsletter = this.args.data.newsletter;
        }
            
        if (!this.newsletter) {
            const newsletters = (await this.store.query('newsletter', {filter: 'status:active', limit: 1})).toArray();
            const defaultNewsletter = newsletters[0];
            this.newsletter = defaultNewsletter;    
        }

        if (html && subject) {
            return;
        }

        // data is an email object
        if (this.args.data.html && this.args.data.subject) {
            html = this.args.data.html;
            subject = this.args.data.subject;
        // data is an object with an email property
        } else if (this.args.data.email) {
            html = this.args.data.email.html;
            subject = this.args.data.email.subject;
        // data is a post? try fetching email preview
        } else {
            let url = this.ghostPaths.url.api('/email_previews/posts', this.args.data.id);
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

        const doctype = new XMLSerializer().serializeToString(htmlDoc.doctype);
        html = doctype + htmlDoc.documentElement.outerHTML;

        this.html = html;
        this.subject = subject;
    }
}
