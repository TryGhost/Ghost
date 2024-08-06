import ModalComponent from 'ghost-admin/components/modal-base';
import copyTextToClipboard from 'ghost-admin/utils/copy-text-to-clipboard';
import {action} from '@ember/object';
import {inject as service} from '@ember/service';
import {task, timeout} from 'ember-concurrency';

export default class ModalPublishFlow extends ModalComponent {
    @service store;

    classNames = ['modal-publish-flow', ...this.classNames];

    get post() {
        return this.model.post;
    }

    get postCount() {
        return this.model.postCount;
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

    @task
    *handleCopyClick() {
        copyTextToClipboard(this.post.url);
        yield timeout(1000);
        return true;
    }
}
