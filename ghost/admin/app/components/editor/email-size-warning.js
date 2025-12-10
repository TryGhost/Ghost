import Component from '@glimmer/component';
import {action} from '@ember/object';
import {inject as service} from '@ember/service';
import {task} from 'ember-concurrency';
import {tracked} from '@glimmer/tracking';

const YELLOW_THRESHOLD = 85 * 1024; // 85KB
const RED_THRESHOLD = 95 * 1024; // 95KB

export default class EmailSizeWarningComponent extends Component {
    @service ajax;
    @service feature;
    @service ghostPaths;
    @service settings;
    @service store;

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
                const sizeBytes = new Blob([emailPreview.html]).size;
                this.emailSizeKb = Math.round(sizeBytes / 1024);

                if (sizeBytes >= RED_THRESHOLD) {
                    this.warningLevel = 'red';
                } else if (sizeBytes >= YELLOW_THRESHOLD) {
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
