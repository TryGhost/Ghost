import Component from '@glimmer/component';
import EmailFailedError from 'ghost-admin/errors/email-failed-error';
import PreviewModal from './modals/preview';
import PublicPreviewReminderModal from './modals/public-preview-reminder';
import PublishFlowModal from './modals/publish-flow';
import PublishOptionsResource from 'ghost-admin/helpers/publish-options';
import TkReminderModal from './modals/tk-reminder';
import UpdateFlowModal from './modals/update-flow';
import envConfig from 'ghost-admin/config/environment';
import {action} from '@ember/object';
import {capitalize} from '@ember/string';
import {getPublicPreviewStatus} from 'ghost-admin/utils/public-preview';
import {inject as service} from '@ember/service';
import {task, taskGroup, timeout} from 'ember-concurrency';
import {tracked} from '@glimmer/tracking';
import {use} from 'ember-could-get-used-to-this';

const SHOW_SAVE_STATUS_DURATION = 3000;
export const CONFIRM_EMAIL_POLL_LENGTH = 1000;
export const CONFIRM_EMAIL_MAX_POLL_LENGTH = 15 * 1000;

export function lexicalHasPublicPreview(lexical) {
    return getPublicPreviewStatus(lexical) !== 'none';
}

// This component exists for the duration of the editor screen being open.
// It's used to store the selected publish options, control the publishing flow
// modal display, and provide an editor-specific save behaviour wrapper around
// PublishOptions saving.
export default class PublishManagement extends Component {
    @service modals;
    @service notifications;
    @service settings;

    // ensure we get a new PublishOptions instance when @post is replaced
    @use publishOptions = new PublishOptionsResource(() => [this.args.post]);

    @tracked previewFormat = 'browser';
    @tracked previewSize = 'desktop';
    @tracked previewAsSegment = 'free';
    @tracked isPaidPostPaywallPromptVisible = false;

    publishFlowModal = null;
    updateFlowModal = null;
    paywallPromptOutsideClickFrame = null;

    get hasUnresolvedPublicPreview() {
        const post = this.args.post;
        const visibility = post.visibility || this.settings.defaultContentVisibility || 'public';
        const lexical = post.lexicalScratch || post.lexical;

        return visibility === 'public' && lexicalHasPublicPreview(lexical);
    }

    get publicPreviewStatus() {
        const post = this.args.post;
        const lexical = post.lexicalScratch || post.lexical;

        return getPublicPreviewStatus(lexical);
    }

    get shouldShowPublicPreviewReminder() {
        return ['bottom', 'multiple'].includes(this.publicPreviewStatus);
    }

    get shouldShowPaidPostPaywallPrompt() {
        const visibility = this.args.post.visibility || this.settings.defaultContentVisibility || 'public';

        return visibility === 'paid'
            && this.publicPreviewStatus === 'none'
            && !this.args.isPublicPreviewGuidanceVisible;
    }

    get paywallPromptAccessLabel() {
        const visibility = this.args.post.visibility || this.settings.defaultContentVisibility || 'public';

        return visibility === 'paid' ? 'Paid-members only' : 'Members only';
    }

    willDestroy() {
        super.willDestroy(...arguments);
        this.publishFlowModal?.close();
        this.hidePaywallPrompt();
    }

    @action
    async openPublishFlow(event, {skipAnimation, skipPaywallPrompt} = {}) {
        event?.preventDefault();

        this.updateFlowModal?.close();

        if (this.focusUnresolvedPublicPreview()) {
            return;
        }

        if (this.shouldShowPublicPreviewReminder) {
            const continueToPublish = await this.modals.open(PublicPreviewReminderModal, {
                publicPreviewStatus: this.publicPreviewStatus
            });

            if (continueToPublish !== true) {
                this.focusPublicPreview();
                return;
            }
        }

        const isValid = await this._validatePost();

        if (isValid && this.shouldShowPaidPostPaywallPrompt && !skipPaywallPrompt) {
            this.isPaidPostPaywallPromptVisible = true;
            this.paywallPromptOutsideClickFrame = requestAnimationFrame(() => {
                this.paywallPromptOutsideClickFrame = null;
                if (this.isPaidPostPaywallPromptVisible) {
                    document.addEventListener('mousedown', this.handlePaywallPromptOutsideClick, true);
                }
            });
            return;
        }

        if (this.args.tkCount > 0) {
            const ignoreTks = await this.modals.open(TkReminderModal, {
                tkCount: this.args.tkCount
            });

            if (ignoreTks !== true) {
                return;
            }
        }

        if (isValid && (!this.publishFlowModal || this.publishFlowModal?.isClosing)) {
            this.publishOptions.resetPastScheduledAt();

            this.publishFlowModal = this.modals.open(PublishFlowModal, {
                publishOptions: this.publishOptions,
                publicPreviewStatus: this.publicPreviewStatus,
                saveTask: this.publishTask,
                togglePreviewPublish: this.togglePreviewPublish,
                skipAnimation
            });

            const result = await this.publishFlowModal;

            if (result?.afterTask && this[result?.afterTask]) {
                await timeout(160); // wait for modal animation to finish
                this[result.afterTask].perform();
            }
        }
    }

    @action
    showPaywallGuidance() {
        this.hidePaywallPrompt();
        this.args.showPublicPreviewGuidance?.();
    }

    @action
    continueFromPaywallPrompt() {
        this.hidePaywallPrompt();
        return this.openPublishFlow(null, {skipPaywallPrompt: true});
    }

    @action
    handlePaywallPromptOutsideClick(event) {
        if (event.target instanceof Element && event.target.closest('[data-test-paid-post-paywall-prompt]')) {
            return;
        }

        this.hidePaywallPrompt();
    }

    hidePaywallPrompt() {
        this.isPaidPostPaywallPromptVisible = false;
        document.removeEventListener('mousedown', this.handlePaywallPromptOutsideClick, true);

        if (this.paywallPromptOutsideClickFrame !== null) {
            cancelAnimationFrame(this.paywallPromptOutsideClickFrame);
            this.paywallPromptOutsideClickFrame = null;
        }
    }

    @action
    focusUnresolvedPublicPreview() {
        if (!this.hasUnresolvedPublicPreview) {
            return false;
        }

        const publicPreviews = Array.from(document.querySelectorAll('[data-kg-public-preview-unresolved="true"]'));
        const publicPreview = publicPreviews.find(element => !element.closest('[data-secondary-instance="true"]'));

        if (!publicPreview) {
            return false;
        }

        publicPreview.scrollIntoView({block: 'center'});
        requestAnimationFrame(() => {
            publicPreview.querySelector('[data-kg-public-preview-access-option]')?.focus();
        });

        return true;
    }

    @action
    focusPublicPreview() {
        const publicPreviews = Array.from(document.querySelectorAll('[data-kg-card="paywall"]'));
        const publicPreview = publicPreviews.find(element => !element.closest('[data-secondary-instance="true"]'));

        if (!publicPreview) {
            return false;
        }

        publicPreview.scrollIntoView({block: 'center'});
        requestAnimationFrame(() => publicPreview.click());

        return true;
    }

    @task({restartable: true})
    *focusPublicPreviewTask() {
        yield timeout(0);
        this.focusPublicPreview();
    }

    @task({restartable: true})
    *showPublicPreviewGuidanceTask() {
        yield timeout(0);
        this.args.showPublicPreviewGuidance?.();
    }

    @action
    async openUpdateFlow(event) {
        event?.preventDefault();

        this.publishFlowModal?.close();

        const isValid = await this._validatePost();

        if (isValid && (!this.updateFlowModal || this.updateFlowModal.isClosing)) {
            this.updateFlowModal = this.modals.open(UpdateFlowModal, {
                publishOptions: this.publishOptions,
                saveTask: this.publishTask
            });

            const result = await this.updateFlowModal;

            if (result?.afterTask && this[result?.afterTask]) {
                await timeout(160); // wait for modal animation to finish
                this[result.afterTask].perform();
            }
        }
    }

    @action
    async openPreview(event, {skipAnimation} = {}) {
        event?.preventDefault();

        const isValid = await this._validatePost();

        if (isValid && (!this.previewModal || this.previewModal.isClosing)) {
            // open publish flow modal underneath to offer quick switching
            // without restarting the flow or causing flicker

            this.previewModal = this.modals.open(PreviewModal, {
                publishOptions: this.publishOptions,
                hasDirtyAttributes: this.args.hasUnsavedChanges,
                saveTask: this.saveTask,
                togglePreviewPublish: this.togglePreviewPublish,
                initialPreviewFormat: this.previewFormat,
                changePreviewFormat: this.changePreviewFormat,
                initialPreviewSize: this.previewSize,
                changePreviewSize: this.changePreviewSize,
                initialPreviewAsSegment: this.previewAsSegment,
                changePreviewAsSegment: this.changePreviewAsSegment,
                isPublicPreviewGuidanceVisible: this.args.isPublicPreviewGuidanceVisible,
                skipAnimation
            });

            const result = await this.previewModal;

            if (result?.afterTask && this[result.afterTask]) {
                await timeout(160); // wait for modal animation to finish
                this[result.afterTask].perform();
            }
        }
    }

    // triggered by ctrl/cmd+p
    @action
    togglePreview(event) {
        if (event?.defaultPrevented) {
            return;
        }
        event?.preventDefault();

        if (!this.previewModal || this.previewModal.isClosing) {
            if (this.publishFlowModal && !this.publishFlowModal.isClosing) {
                this.togglePreviewPublish();
            } else {
                this.openPreview();
            }
        } else {
            this.previewModal.close();
        }
    }

    @action
    changePreviewFormat(format) {
        this.previewFormat = format;
    }

    @action
    changePreviewSize(size) {
        this.previewSize = size;
    }

    @action
    changePreviewAsSegment(segment) {
        this.previewAsSegment = segment;
    }

    @action
    async togglePreviewPublish(event, {skipPaywallPrompt = false} = {}) {
        event?.preventDefault();

        if (this.previewModal && !this.previewModal.isClosing) {
            this.openPublishFlow(event, {skipAnimation: true, skipPaywallPrompt});
            await timeout(160);
            this.previewModal.close();
        } else if (this.publishFlowModal && !this.publishFlowModal.isClosing) {
            this.openPreview(event, {skipAnimation: true});
            await timeout(160);
            this.publishFlowModal.close();
        }
    }

    async _validatePost() {
        this.notifications.closeAlerts('post.save');

        try {
            await this.publishOptions.post.validate();
            return true;
        } catch (e) {
            if (e === undefined && this.publishOptions.post.errors.length !== 0) {
                // validation error
                const validationError = this.publishOptions.post.errors.messages[0];
                const errorMessage = `Validation failed: ${validationError}`;

                this.notifications.showAlert(errorMessage, {type: 'error', key: 'post.save'});
                return false;
            }

            this.notifications.showAPIError(e);
        }
    }

    @task
    *publishTask({taskName = 'saveTask'} = {}) {
        const willEmailImmediately = this.publishOptions.willEmailImmediately;

        // clean up blank editor cards
        // apply cloned lexical
        // apply scratch values
        // generate slug if needed (should never happen - publish flow can't be opened on new posts)
        yield this.args.beforePublish();

        // apply publish options (with undo on failure)
        // save with the required query params for emailing
        const result = yield this.publishOptions[taskName].perform();

        // perform any post-save cleanup for the editor
        yield this.args.afterPublish(result);

        // if emailed, wait until it has been submitted so we can show a failure message if needed
        if (willEmailImmediately && this.publishOptions.post.email) {
            yield this.confirmEmailTask.perform();
        }

        return result;
    }

    // used by the non-publish "Save" button shown for scheduled/published posts
    @task({group: 'saveButtonTaskGroup'})
    *saveTask() {
        if (this.focusUnresolvedPublicPreview()) {
            return false;
        }

        yield this.args.saveTask.perform();
        this.saveButtonTimeoutTask.perform();
        return true;
    }

    @task({group: 'saveButtonTaskGroup'})
    *saveButtonTimeoutTask() {
        yield timeout(envConfig.environment === 'test' ? 1 : SHOW_SAVE_STATUS_DURATION);
    }

    @taskGroup saveButtonTaskGroup;

    @task
    *confirmEmailTask() {
        const post = this.publishOptions.post;

        let pollTimeout = 0;
        if (post.email && post.email.status !== 'submitted') {
            while (pollTimeout < CONFIRM_EMAIL_MAX_POLL_LENGTH) {
                yield timeout(CONFIRM_EMAIL_POLL_LENGTH);
                pollTimeout += CONFIRM_EMAIL_POLL_LENGTH;

                yield post.reload();

                if (!post.isSent && !post.isPublished) {
                    // A post that is not published doesn't try to send or retry an email
                    break;
                }

                if (post.email.status === 'submitted') {
                    break;
                }
                if (post.email.status === 'failed') {
                    throw new EmailFailedError(post.email.error);
                }
            }
        }

        return true;
    }

    @task
    *revertToDraftTask() {
        try {
            yield this.publishTask.perform({taskName: 'revertToDraftTask'});

            const postType = capitalize(this.args.post.displayName);
            this.notifications.showNotification(`${postType} reverted to a draft.`, {type: 'success'});

            return true;
        } catch (e) {
            this.notifications.showAPIError(e);
        }
    }
}
