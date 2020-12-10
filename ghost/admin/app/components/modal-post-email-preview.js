import ModalComponent from 'ghost-admin/components/modal-base';
import {action} from '@ember/object';
import {alias} from '@ember/object/computed';
import {inject as service} from '@ember/service';
import {timeout} from 'ember-concurrency';

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

export default ModalComponent.extend({
    ghostPaths: service(),
    ajax: service(),
    settings: service(),
    config: service(),

    type: 'desktop',
    html: '',
    subject: '',

    post: alias('model'),

    actions: {
        changeType(type) {
            this.set('type', type);
        }
    },

    renderEmailPreview: action(async function renderEmailPreview(iframe) {
        await this._fetchEmailData();
        // avoid timing issues when _fetchEmailData didn't perform any async ops
        await timeout(100);

        if (iframe) {
            iframe.contentWindow.document.open();
            iframe.contentWindow.document.write(this.html);
            iframe.contentWindow.document.close();
        }
    }),

    async _fetchEmailData() {
        let {html, subject} = this;

        if (html && subject) {
            return {html, subject};
        }

        // model is an email
        if (this.model.html && this.model.subject) {
            html = this.model.html;
            subject = this.model.subject;
        // model is a post with an existing email
        } else if (this.post.email) {
            html = this.post.email.html;
            subject = this.post.email.subject;
        // model is a post, fetch email preview
        } else {
            let url = this.get('ghostPaths.url').api('/email_preview/posts', this.post.id);
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

        this.setProperties({html, subject});
    }
});
