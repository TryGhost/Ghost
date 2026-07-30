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
    @service router;
    @service feature;

    @tracked emailErrorMessage = this.args.data.publishOptions.post.didEmailFail ? (this.args.data.publishOptions.post.email.error ?? 'Unknown error') : undefined;
    @tracked isConfirming = false;
    @tracked isComplete = false;
    @tracked postCount = null;

    // publish flow redesign (labs: publishFlowRedesign) step state
    @tracked step = 'website';

    // placing the preview line is a detour, not a step: an email-only post
    // starts it from the email row that owns the decision, and Done returns
    // there instead of stranding the writer on the website step
    @tracked placementReturnStep = null;

    get useRedesign() {
        return this.feature.publishFlowRedesign;
    }

    @action
    startPlacement(returnStep) {
        this.placementReturnStep = returnStep;
        this.step = 'website';
    }

    @action
    finishPlacement() {
        const returnStep = this.placementReturnStep;
        this.placementReturnStep = null;

        if (returnStep) {
            this.setStep(returnStep);
        }
    }

    @action
    setStep(step) {
        this.step = step;

        // only placement docks the modal — every other step is a fullscreen
        // room with a single focus; email evidence is inline, not ambient
        if (step !== 'website') {
            this.setDocked(false);
        }

        if (step === 'confirm') {
            this.fetchPostCountTask.perform();
        }
    }

    // the docked state shrinks the fullscreen modal to a right-hand panel so
    // the live editor (or a canvas rendered by the current step) shows on the
    // left; classes go on the epm elements because the modal wrapper markup
    // belongs to ember-promise-modals, not to this template
    @action
    setDocked(docked) {
        const modalEl = document.querySelector('[data-test-modal="publish-flow"]')?.closest('.epm-modal');
        const containerEl = modalEl?.closest('.epm-modal-container');

        modalEl?.classList.toggle('gh-publish-docked', docked);
        containerEl?.classList.toggle('gh-publish-dock-container', docked);
        // re-centers the editor within the space left of the panel
        document.body.classList.toggle('gh-publish-dock-active', docked);
    }

    willDestroy() {
        super.willDestroy(...arguments);
        this.args.data.editorAPI?.exitPaywallPlacement?.();
        document.body.classList.remove('gh-publish-dock-active');
    }

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

    @action
    setCompleted() {
        this.emailErrorMessage = undefined;
        this.isConfirming = false;
        this.isComplete = true;

        if (this.args.data.publishOptions.isScheduled) {
            try {
                localStorage.setItem('ghost-last-scheduled-post', JSON.stringify({
                    id: this.args.data.publishOptions.post.id,
                    type: this.args.data.publishOptions.post.displayName
                }));
            } catch (e) {
                // ignore localStorage errors
            }
            if (this.args.data.publishOptions.post.displayName !== 'page') {
                this.router.transitionTo('posts');
            } else {
                this.router.transitionTo('pages');
            }
        } else {
            try {
                localStorage.setItem('ghost-last-published-post', JSON.stringify({
                    id: this.args.data.publishOptions.post.id,
                    type: this.args.data.publishOptions.post.displayName
                }));
            } catch (e) {
                // ignore localStorage errors
            }
            if (this.args.data.publishOptions.post.displayName !== 'page') {
                if (this.args.data.publishOptions.post.hasEmail) {
                    this.router.transitionTo(`/posts/analytics/${this.args.data.publishOptions.post.id}`);
                } else {
                    this.router.transitionTo('posts');
                }
            } else {
                this.router.transitionTo('pages');
            }
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
                this.emailErrorMessage = e.message;
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
