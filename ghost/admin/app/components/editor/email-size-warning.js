import Component from '@glimmer/component';
import {action} from '@ember/object';
import {inject} from 'ghost-admin/decorators/inject';
import {inject as service} from '@ember/service';
import {task} from 'ember-concurrency';
import {tracked} from '@glimmer/tracking';

const YELLOW_THRESHOLD = 85 * 1024; // 85KB
const RED_THRESHOLD = 95 * 1024; // 95KB

// Rewritten URLs in real emails have a fixed format:
// {siteUrl}/r/{8-char-hex}?m={36-char-uuid}
// The path portion "/r/{8-char-hex}?m={36-char-uuid}" is always 50 characters
const REWRITTEN_URL_PATH_LENGTH = 50;

export default class EmailSizeWarningComponent extends Component {
    @service ajax;
    @service feature;
    @service ghostPaths;
    @service settings;
    @service store;

    @inject config;

    @tracked warningLevel = null; // 'yellow', 'red', or null
    @tracked emailSizeKb = null;

    _newsletter = null;

    get isEnabled() {
        return this.feature.emailSizeWarnings
            // no need to show email size if newsletters are disabled
            && this.settings.editorDefaultEmailRecipients !== 'disabled'
            && this.post
            && !this.post.email
            && !this.post.isNew;
    }

    get post() {
        return this.args.post;
    }

    constructor() {
        super(...arguments);
        if (this.isEnabled) {
            this.checkEmailSizeTask.perform();
        }
    }

    @action
    checkEmailSize() {
        if (this.isEnabled) {
            this.checkEmailSizeTask.perform();
        }
    }

    async _loadNewsletter() {
        if (!this._newsletter) {
            const newsletters = await this.store.query('newsletter', {
                filter: 'status:active',
                order: 'sort_order DESC',
                limit: 1
            });
            this._newsletter = newsletters.firstObject;
        }
    }

    /**
     * Calculate size adjustment for URL rewriting that happens when emails are actually sent.
     * In real emails, links in the main content area are rewritten from their original URLs
     * to tracking URLs like: {siteUrl}/r/{8-char-hex}?m={36-char-uuid}
     * This can result in significant byte savings for posts with many long URLs.
     *
     * Only links within the post content area are rewritten - header, footer, and other
     * template links remain unchanged.
     *
     * @param {string} html - The email preview HTML
     * @returns {number} - The estimated byte difference (negative = smaller in real email)
     */
    _calculateLinkRewritingAdjustment(html) {
        // Extract only the post content area - links outside this area are not rewritten
        const contentStartMarker = '<!-- POST CONTENT START -->';
        const contentEndMarker = '<!-- POST CONTENT END -->';

        const startIndex = html.indexOf(contentStartMarker);
        const endIndex = html.indexOf(contentEndMarker);

        // If markers are found, use only the content area; otherwise fall back to the whole HTML
        let contentHtml;
        if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
            contentHtml = html.substring(startIndex + contentStartMarker.length, endIndex);
        } else {
            contentHtml = html;
        }

        const siteUrlLength = (this.config.blogUrl || '').length;
        // The rewritten URL will be: {siteUrl}/r/{8-char-hex}?m={36-char-uuid}
        const rewrittenUrlLength = siteUrlLength + REWRITTEN_URL_PATH_LENGTH;

        // Find all href values in anchor tags within the content
        // We use a simple regex to extract href values - this matches the approach used
        // in the backend link-replacer.js
        const hrefRegex = /href="([^"]+)"/g;
        let totalAdjustment = 0;
        let match;

        while ((match = hrefRegex.exec(contentHtml)) !== null) {
            const originalUrl = match[1];

            if (originalUrl.startsWith('%%{') && originalUrl.endsWith('}%%')) {
                continue;
            }

            if (originalUrl === '#') {
                continue;
            }

            if (!originalUrl.startsWith('http://') && !originalUrl.startsWith('https://') && !originalUrl.startsWith('/')) {
                continue;
            }

            totalAdjustment += rewrittenUrlLength - originalUrl.length;
        }

        return totalAdjustment;
    }

    @task({restartable: true})
    *checkEmailSizeTask() {
        if (!this.post?.id || this.post.isNew) {
            return;
        }

        yield this._loadNewsletter();
        if (!this._newsletter) {
            return;
        }

        try {
            // NOTE: we don't pass memberSegment param so we always preview the full post content
            const url = new URL(
                this.ghostPaths.url.api('/email_previews/posts', this.post.id),
                window.location.href
            );
            url.searchParams.set('newsletter', this._newsletter.slug);

            const response = yield this.ajax.request(url.href);
            const [emailPreview] = response.email_previews;

            if (emailPreview?.html) {
                const previewSizeBytes = new Blob([emailPreview.html]).size;

                // Adjust for URL rewriting that occurs in real emails
                // This can significantly reduce the actual email size for posts with many links
                const linkAdjustment = this._calculateLinkRewritingAdjustment(emailPreview.html);
                const estimatedSizeBytes = Math.max(0, previewSizeBytes + linkAdjustment);

                this.emailSizeKb = Math.round(estimatedSizeBytes / 1024);

                if (estimatedSizeBytes >= RED_THRESHOLD) {
                    this.warningLevel = 'red';
                } else if (estimatedSizeBytes >= YELLOW_THRESHOLD) {
                    this.warningLevel = 'yellow';
                } else {
                    this.warningLevel = null;
                }
            }
        } catch (error) {
            // Silently fail - don't interrupt the user's editing
            console.error('Email size check failed:', error); // eslint-disable-line no-console
        }
    }
}
