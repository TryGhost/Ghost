import Component from '@glimmer/component';
import copyTextToClipboard from 'ghost-admin/utils/copy-text-to-clipboard';
import {action} from '@ember/object';
import {capitalize} from '@ember/string';
import {inject as service} from '@ember/service';
import {task, timeout} from 'ember-concurrency';

export default class PostSuccessModal extends Component {
    @service store;
    @service router;
    @service notifications;

    static modalOptions = {
        className: 'fullscreen-modal-wide fullscreen-modal-action modal-post-success'
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

    @action
    handleTwitter() {
        window.open(`https://twitter.com/intent/tweet?url=${encodeURI(this.post.url)}`, '_blank');
    }

    @action
    handleThreads() {
        window.open(`https://threads.net/intent/post?text=${encodeURI(this.post.url)}`, '_blank');
    }

    @action
    handleFacebook() {
        window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURI(this.post.url)}`, '_blank');
    }

    @action
    handleLinkedIn() {
        window.open(`http://www.linkedin.com/shareArticle?mini=true&url=${encodeURI(this.post.url)}`, '_blank');
    }

    @action
    viewInBrowser() {
        window.open(this.post.url, '_blank');
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
