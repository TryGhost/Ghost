import Service, {inject as service} from '@ember/service';
import {inject} from 'ghost-admin/decorators/inject';
import {task} from 'ember-concurrency';

const YELLOW_THRESHOLD = 90 * 1024; // 90KB
const RED_THRESHOLD = 100 * 1024; // 100KB

// Rewritten URLs in real emails have a fixed format:
// {siteUrl}/r/{8-char-hex}?m={36-char-uuid}
// The path portion "/r/{8-char-hex}?m={36-char-uuid}" is always 50 characters
const REWRITTEN_URL_PATH_LENGTH = 50;

/**
 * Service to fetch email size data for posts.
 * Deduplicates API requests when multiple components request data for the same post version.
 */
export default class EmailSizeWarningService extends Service {
    @service ajax;
    @service ghostPaths;
    @service store;

    @inject config;

    _newsletter = null;
    _lastPostId = null;
    _lastUpdatedAt = null;

    /**
     * Fetch email size data for a post.
     * Returns existing task instance if one is running/completed for same post version.
     * Multiple concurrent calls for the same post version will share a single API request.
     *
     * @param {Object} post - The post model
     * @returns {Promise<{warningLevel: string|null, emailSizeKb: number|null}>}
     */
    fetchEmailSize(post) {
        if (!post?.id || post.isNew) {
            return Promise.resolve({warningLevel: null, emailSizeKb: null});
        }

        const postId = post.id;
        const updatedAt = post.updatedAtUTC?.toISOString?.() || post.updatedAtUTC;

        // Return existing task instance if we have one for this exact version
        if (this._lastPostId === postId && this._lastUpdatedAt === updatedAt && this._fetchTask.last) {
            return this._fetchTask.last;
        }

        this._lastPostId = postId;
        this._lastUpdatedAt = updatedAt;

        return this._fetchTask.perform(post);
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
        return this._newsletter;
    }

    _calculateLinkRewritingAdjustment(html) {
        const contentStartMarker = '<!-- POST CONTENT START -->';
        const contentEndMarker = '<!-- POST CONTENT END -->';

        const startIndex = html.indexOf(contentStartMarker);
        const endIndex = html.indexOf(contentEndMarker);

        let contentHtml;
        if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
            contentHtml = html.substring(startIndex + contentStartMarker.length, endIndex);
        } else {
            contentHtml = html;
        }

        const siteUrlLength = (this.config.blogUrl || '').length;
        const rewrittenUrlLength = siteUrlLength + REWRITTEN_URL_PATH_LENGTH;

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

    @task
    *_fetchTask(post) {
        yield this._loadNewsletter();
        if (!this._newsletter) {
            return {warningLevel: null, emailSizeKb: null};
        }

        try {
            const url = new URL(
                this.ghostPaths.url.api('/email_previews/posts', post.id),
                window.location.href
            );
            url.searchParams.set('newsletter', this._newsletter.slug);

            const response = yield this.ajax.request(url.href);
            const [emailPreview] = response.email_previews;

            if (emailPreview?.html) {
                const previewSizeBytes = new Blob([emailPreview.html]).size;
                const linkAdjustment = this._calculateLinkRewritingAdjustment(emailPreview.html);
                const estimatedSizeBytes = Math.max(0, previewSizeBytes + linkAdjustment);

                const emailSizeKb = Math.round(estimatedSizeBytes / 1024);
                let warningLevel = null;

                if (estimatedSizeBytes >= RED_THRESHOLD) {
                    warningLevel = 'red';
                } else if (estimatedSizeBytes >= YELLOW_THRESHOLD) {
                    warningLevel = 'yellow';
                }

                return {warningLevel, emailSizeKb};
            }
        } catch (error) {
            console.error('Email size check failed:', error); // eslint-disable-line no-console
        }

        return {warningLevel: null, emailSizeKb: null};
    }
}
