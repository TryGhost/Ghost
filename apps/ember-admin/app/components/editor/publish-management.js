import Component from '@glimmer/component';
import EmailFailedError from 'ghost-admin/errors/email-failed-error';
import PreviewModal from './modals/preview';
import PublicPreviewWarningModal from './modals/public-preview-warning';
import PublishFlowModal from './modals/publish-flow';
import PublishOptionsResource from 'ghost-admin/helpers/publish-options';
import TkReminderModal from './modals/tk-reminder';
import UpdateFlowModal from './modals/update-flow';
import envConfig from 'ghost-admin/config/environment';
import {action} from '@ember/object';
import {capitalize} from '@ember/string';
import {inject as service} from '@ember/service';
import {task, taskGroup, timeout} from 'ember-concurrency';
import {tracked} from '@glimmer/tracking';
import {use} from 'ember-could-get-used-to-this';

const SHOW_SAVE_STATUS_DURATION = 3000;
const PUBLIC_PREVIEW_NOTIFICATION_KEY = 'paywall.public-preview-added';
export const CONFIRM_EMAIL_POLL_LENGTH = 1000;
export const CONFIRM_EMAIL_MAX_POLL_LENGTH = 15 * 1000;

// This component exists for the duration of the editor screen being open.
// It's used to store the selected publish options, control the publishing flow
// modal display, and provide an editor-specific save behaviour wrapper around
// PublishOptions saving.
export default class PublishManagement extends Component {
    @service feature;
    @service modals;
    @service notifications;
    @service settings;
    @service store;

    // ensure we get a new PublishOptions instance when @post is replaced
    @use publishOptions = new PublishOptionsResource(() => [this.args.post]);

    @tracked previewFormat = 'browser';
    @tracked previewSize = 'desktop';
    @tracked previewAsSegment = 'free';
    @tracked previewTierSlug;
    @tracked tiers = [];

    publishFlowModal = null;
    updateFlowModal = null;

    willDestroy() {
        super.willDestroy(...arguments);
        this.publishFlowModal?.close();
        // leaving the editor entirely — the preview confirmation is only
        // meaningful while you're looking at the post
        this.dismissPublicPreviewNotification();
    }

    // The "public preview added" notification is sticky so it survives the
    // editor's autosave. That means we have to retire it ourselves once the
    // author's attention moves elsewhere.
    dismissPublicPreviewNotification() {
        this.notifications.closeNotifications(PUBLIC_PREVIEW_NOTIFICATION_KEY);
    }

    @action
    async openPublishFlow(event, {skipAnimation, openSection} = {}) {
        event?.preventDefault();
        this.dismissPublicPreviewNotification();

        this.updateFlowModal?.close();

        const isValid = await this._validatePost();

        if (this.args.tkCount > 0) {
            const ignoreTks = await this.modals.open(TkReminderModal, {
                tkCount: this.args.tkCount
            });

            if (ignoreTks !== true) {
                return;
            }
        }

        if (isValid && this.publishOptions.publicPreviewWarning) {
            const ignorePublicPreviewWarning = await this.modals.open(PublicPreviewWarningModal, {
                warning: this.publishOptions.publicPreviewWarning
            });

            if (ignorePublicPreviewWarning !== true) {
                return;
            }
        }

        if (isValid && (!this.publishFlowModal || this.publishFlowModal?.isClosing)) {
            this.publishOptions.resetPastScheduledAt();

            this.publishFlowModal = this.modals.open(PublishFlowModal, {
                publishOptions: this.publishOptions,
                saveTask: this.publishTask,
                togglePreviewPublish: this.togglePreviewPublish,
                addPublicPreview: this.addPublicPreview,
                openSection,
                skipAnimation
            });

            const result = await this.publishFlowModal;

            if (result?.afterTask && this[result?.afterTask]) {
                await timeout(160); // wait for modal animation to finish
                this[result.afterTask].perform();
            }
        }
    }

    // Called when the author chooses "Add public preview" from the paid-post
    // warning. Places the paywall for them and leaves a way back into the
    // publish flow — previously this dropped them in the editor with nothing
    // inserted, no confirmation their publish settings survived, and no route
    // back to the audience they still need to confirm.
    @action
    addPublicPreview() {
        const didInsert = this.args.addPublicPreview?.();

        this.notifications.showNotification(
            didInsert
                ? 'Public preview added. Drag it to change where the free part ends.'
                : 'Add a public preview where you want the free part to end.',
            {
                type: 'success',
                key: PUBLIC_PREVIEW_NOTIFICATION_KEY,
                // keep it up long enough to read — the editor's autosave would
                // otherwise clear it moments later
                sticky: true
            }
        );
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
    async openPreview(event, {skipAnimation, scrollToPaywall} = {}) {
        event?.preventDefault();
        this.dismissPublicPreviewNotification();

        const isValid = await this._validatePost();
        await this._ensureTiersLoaded();

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
                initialPreviewTierSlug: this.previewTierSlug,
                changePreviewTier: this.changePreviewTier,
                tiers: this.tiers,
                skipAnimation,
                scrollToPaywall
            });
        }
    }

    @action
    openFreeEmailPreview(event) {
        this.previewFormat = 'email';
        this.previewAsSegment = 'free';
        this.previewTierSlug = undefined;

        return this.openPreview(event, {scrollToPaywall: true});
    }

    // tiers are loaded once per editor session so the preview modal can render
    // its tier selector synchronously; a failed fetch degrades the preview to
    // the free/paid audience options and is retried on the next open
    async _ensureTiersLoaded() {
        if (!this.feature.previewByTier || !this.settings.paidMembersEnabled || this.loadTiersTask.lastSuccessful) {
            return;
        }

        try {
            await this.loadTiersTask.perform();
        } catch (error) {
            // no-op, degraded preview
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
    changePreviewTier(tierSlug) {
        this.previewTierSlug = tierSlug;
    }

    @task
    *loadTiersTask() {
        const tiers = yield this.store.query('tier', {filter: 'type:paid', limit: 'all'});
        this.tiers = tiers.toArray();
    }

    @action
    async togglePreviewPublish(event) {
        event?.preventDefault();

        if (this.previewModal && !this.previewModal.isClosing) {
            this.openPublishFlow(event, {skipAnimation: true});
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
