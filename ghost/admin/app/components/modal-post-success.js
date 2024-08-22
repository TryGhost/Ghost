import Component from '@glimmer/component';
import copyTextToClipboard from 'ghost-admin/utils/copy-text-to-clipboard';
import {authorNames} from '../helpers/author-names';
import {capitalize} from '@ember/string';
import {inject as service} from '@ember/service';
import {task, timeout} from 'ember-concurrency';

export default class PostSuccessModal extends Component {
    @service store;
    @service router;
    @service notifications;

    static modalOptions = {
        className: 'fullscreen-modal-wide fullscreen-modal-action modal-post-success',
        backgroundBlur: true
    };

    get post() {
        return this.args.data.post;
    }

    get postCount() {
        return this.args.data.postCount;
    }

    get showPostCount() {
        return this.args.data.showPostCount;
    }

    get encodedTitle() {
        return encodeURIComponent(this.post.title);
    }

    get encodedUrl() {
        return encodeURIComponent(this.post.url);
    }

    get encodedTitleAndUrl() {
        return encodeURIComponent(`${this.post.title} ${this.post.url}`);
    }

    get authorNames() {
        return authorNames([this.post.authors]);
    }

    @task
    *handleCopyLink() {
        copyTextToClipboard(this.post.url);
        yield timeout(1000);
        return true;
    }

    @task
    *handleCopyPreviewLink() {
        copyTextToClipboard(this.post.previewUrl);
        yield timeout(1000);
        return true;
    }

    @task
    *revertToDraftTask() {
        const currentPost = this.post;
        const originalStatus = currentPost.status;
        const originalPublishedAtUTC = currentPost.publishedAtUTC;

        try {
            if (currentPost.isScheduled) {
                currentPost.publishedAtUTC = null;
            }

            currentPost.status = 'draft';
            currentPost.emailOnly = false;

            yield currentPost.save();
            this.router.transitionTo('lexical-editor.edit', 'post', currentPost.id);

            const postType = capitalize(currentPost.displayName);
            this.notifications.showNotification(`${postType} reverted to a draft.`, {type: 'success'});

            return true;
        } catch (e) {
            currentPost.status = originalStatus;
            currentPost.publishedAtUTC = originalPublishedAtUTC;
            throw e;
        }
    }
}
