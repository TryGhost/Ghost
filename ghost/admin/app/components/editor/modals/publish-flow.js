import Component from '@glimmer/component';
import {action} from '@ember/object';
import {inject as service} from '@ember/service';
import {task} from 'ember-concurrency';
import {tracked} from '@glimmer/tracking';

export default class PublishModalComponent extends Component {
    static modalOptions = {
        className: 'fullscreen-modal-total-overlay publish-modal',
        omitBackdrop: true,
        ignoreBackdropClick: true
    };

    @service store;

    @tracked emailErrorMessage;
    @tracked isConfirming = false;
    @tracked isComplete = false;
    @tracked postCount = null;

    get recipientType() {
        const filter = this.args.data.publishOptions.recipientFilter;

        if (!filter) {
            return 'none';
        }

        if (filter === 'status:free') {
            return 'free';
        }

        if (filter === 'status:-free') {
            return 'paid';
        }

        if (filter.includes('status:free') && filter.includes('status:-free')) {
            return 'all';
        }

        return 'specific';
    }

    @action
    toggleConfirm() {
        this.isConfirming = !this.isConfirming;

        if (this.isConfirming) {
            this.fetchPostCountTask.perform();
        }
    }

    @task
    *saveTask() {
        try {
            yield this.args.data.saveTask.perform();

            this.isConfirming = false;
            this.isComplete = true;
        } catch (e) {
            if (e?.name === 'EmailFailedError') {
                return this.emailErrorMessage = e.message;
            }

            throw e;
        }
    }

    // we fetch the new post count in advance when reaching the confirm step
    // to avoid a copy flash when reaching the complete step
    @task
    *fetchPostCountTask() {
        const publishOptions = this.args.data.publishOptions;

        // no count is shown for pages, scheduled posts, or email-only posts
        if (publishOptions.post.isPage || publishOptions.isScheduled || !publishOptions.willPublish) {
            this.postCount = null;
            return;
        }

        const result = yield this.store.query('post', {filter: 'status:published', limit: 1});
        let count = result.meta.pagination.total;

        count += 1; // account for the new post

        this.postCount = count;
    }
}
