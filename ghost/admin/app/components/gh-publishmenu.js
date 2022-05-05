import Component from '@ember/component';
import ConfirmPublishModal from './modals/editor/confirm-publish';
import EmailFailedError from 'ghost-admin/errors/email-failed-error';
import {action, computed} from '@ember/object';
import {bind, schedule} from '@ember/runloop';
import {or, reads} from '@ember/object/computed';
import {inject as service} from '@ember/service';
import {task, timeout} from 'ember-concurrency';

const CONFIRM_EMAIL_POLL_LENGTH = 1000;
const CONFIRM_EMAIL_MAX_POLL_LENGTH = 15 * 1000;

export default Component.extend({
    clock: service(),
    config: service(),
    feature: service(),
    limit: service(),
    modals: service(),
    session: service(),
    settings: service(),
    store: service(),

    classNames: 'gh-publishmenu',
    displayState: 'draft',
    saveType: 'publish',
    post: null,
    postStatus: 'draft',
    distributionAction: 'publish_send',
    runningText: null,
    saveTask: null,
    sendEmailWhenPublished: null,
    typedDateError: null,
    isSendingEmailLimited: false,
    sendingEmailLimitError: '',
    selectedNewsletter: null,

    _publishedAtBlogTZ: null,
    _previousStatus: null,

    isClosing: null,

    onClose() {},

    forcePublishedMenu: reads('post.pastScheduledTime'),

    hasEmailPermission: or('session.user.isOwnerOnly', 'session.user.isAdminOnly', 'session.user.isEditor'),

    emailOnly: computed.equal('distributionAction', 'send'),

    canSendEmail: computed('hasEmailPermission', 'post.{isPost,email}', 'settings.{editorDefaultEmailRecipients,membersSignupAccess,mailgunIsConfigured}', 'config.mailgunIsConfigured', function () {
        let isDisabled = this.settings.get('editorDefaultEmailRecipients') === 'disabled' || this.settings.get('membersSignupAccess') === 'none';
        let mailgunIsConfigured = this.settings.get('mailgunIsConfigured') || this.config.get('mailgunIsConfigured');
        let isPost = this.post.isPost;
        let hasSentEmail = !!this.post.email;

        return this.hasEmailPermission &&
            !isDisabled &&
            mailgunIsConfigured &&
            isPost &&
            !hasSentEmail;
    }),

    postState: computed('post.{isPublished,isScheduled}', 'forcePublishedMenu', function () {
        if (this.forcePublishedMenu || this.get('post.isPublished')) {
            return 'published';
        } else if (this.get('post.isScheduled')) {
            return 'scheduled';
        } else {
            return 'draft';
        }
    }),

    triggerText: computed('postState', function () {
        let state = this.postState;

        if (state === 'published') {
            return 'Update';
        } else if (state === 'scheduled') {
            return 'Scheduled';
        } else {
            return 'Publish';
        }
    }),

    _runningText: computed('postState', 'saveType', function () {
        let saveType = this.saveType;
        let postState = this.postState;
        let runningText;

        if (postState === 'draft') {
            runningText = saveType === 'publish' ? 'Publishing' : 'Scheduling';
        }

        if (postState === 'published') {
            runningText = saveType === 'publish' ? 'Updating' : 'Unpublishing';
        }

        if (postState === 'scheduled') {
            runningText = saveType === 'schedule' ? 'Rescheduling' : 'Unscheduling';
        }

        return runningText || 'Publishing';
    }),

    buttonText: computed('postState', 'saveType', 'distributionAction', 'sendEmailWhenPublished', function () {
        let saveType = this.saveType;
        let postState = this.postState;
        let distributionAction = this.distributionAction;
        let buttonText;

        if (postState === 'draft') {
            switch (distributionAction) {
            case 'publish_send':
                if (saveType === 'publish') {
                    buttonText = 'Publish';

                    if (this.canSendEmail && this.sendEmailWhenPublished && this.sendEmailWhenPublished !== 'none') {
                        buttonText = `${buttonText} & send`;
                    }
                } else {
                    buttonText = 'Schedule';
                }
                break;
            case 'publish':
                buttonText = (saveType === 'publish') ? 'Publish' : 'Schedule';
                break;
            case 'send':
                buttonText = saveType === 'publish' ? 'Send' : 'Schedule';
                break;
            }
        }

        if (postState === 'published') {
            buttonText = saveType === 'publish' ? 'Update' : 'Unpublish';
        }

        if (postState === 'scheduled') {
            buttonText = saveType === 'schedule' ? 'Reschedule' : 'Unschedule';
        }

        return buttonText || 'Publish';
    }),

    successText: computed('_previousStatus', 'postState', function () {
        let postState = this.postState;
        let previousStatus = this._previousStatus;
        let buttonText;

        if (previousStatus === 'draft') {
            buttonText = postState === 'published' ? 'Published' : 'Scheduled';
        }

        if (previousStatus === 'published') {
            buttonText = postState === 'draft' ? 'Unpublished' : 'Updated';
        }

        if (previousStatus === 'scheduled') {
            buttonText = postState === 'draft' ? 'Unscheduled' : 'Rescheduled';
        }

        return buttonText;
    }),

    defaultEmailRecipients: computed('settings.{editorDefaultEmailRecipients,editorDefaultEmailRecipientsFilter}', 'post.visibility', function () {
        const defaultEmailRecipients = this.settings.get('editorDefaultEmailRecipients');

        if (defaultEmailRecipients === 'disabled') {
            return null;
        }

        if (defaultEmailRecipients === 'visibility') {
            if (this.post.visibility === 'public') {
                return 'status:free,status:-free';
            }

            if (this.post.visibility === 'members') {
                return 'status:free,status:-free';
            }

            if (this.post.visibility === 'paid') {
                return 'status:-free';
            }

            if (this.post.visibility === 'tiers') {
                return this.post.visibilitySegment;
            }

            return this.post.visibility;
        }

        return this.settings.get('editorDefaultEmailRecipientsFilter');
    }),

    didReceiveAttrs() {
        this._super(...arguments);

        // update the displayState based on the post status but only after a
        // save has finished to avoid swapping the menu prematurely and triggering
        // calls to `setSaveType` due to the component re-rendering
        // TODO: we should have a better way of dealing with this where we don't
        // rely on the side-effect of component rendering calling setSaveType
        let postStatus = this.postStatus;
        if (postStatus !== this._postStatus) {
            if (this.get('saveTask.isRunning')) {
                this.get('saveTask.last').then(() => {
                    this.set('displayState', postStatus);
                    this.updateSaveTypeForPostStatus(postStatus);
                });
            } else {
                this.set('displayState', postStatus);
                this.updateSaveTypeForPostStatus(postStatus);
            }
        }

        this._postStatus = this.postStatus;
        this.setDefaultSendEmailWhenPublished();
        this.checkIsSendingEmailLimitedTask.perform();

        const defaultEmailRecipients = this.get('defaultEmailRecipients');

        if (this.post.status === 'scheduled' && this.post.emailOnly) {
            this.set('distributionAction', 'send');
        }

        if (this.post.isPage || !defaultEmailRecipients) {
            this.set('distributionAction', 'publish');
        }
    },

    didInsertElement() {
        this._super(...arguments);
        this.fetchNewslettersTask.perform();
    },

    actions: {
        setSaveType(saveType) {
            let post = this.post;

            this.set('saveType', saveType);

            if (saveType === 'draft') {
                post.set('statusScratch', 'draft');
            } else if (saveType === 'schedule') {
                post.set('statusScratch', 'scheduled');
            } else if (saveType === 'publish') {
                post.set('statusScratch', 'published');
            }
        },

        setSendEmailWhenPublished(sendEmailWhenPublished) {
            this.set('sendEmailWhenPublished', sendEmailWhenPublished);
        },

        setDistributionAction(distributionAction) {
            this.set('distributionAction', distributionAction);

            if (distributionAction === 'publish') {
                this.set('sendEmailWhenPublished', 'none');
            } else {
                this.set('sendEmailWhenPublished', this.defaultEmailRecipients);
            }
        },

        open() {
            this._cachePublishedAtBlogTZ();
            this.set('isClosing', false);
            this.get('post.errors').clear();

            this.setDefaultSendEmailWhenPublished();

            if (this.onOpen) {
                this.onOpen();
            }
        },

        close(dropdown, e) {
            // don't close the menu if the datepicker popup or confirm modal is clicked
            if (e) {
                let onDatepicker = !!e.target.closest('.ember-power-datepicker-content');
                let onModal = !!e.target.closest('.fullscreen-modal-container');

                if (onDatepicker || onModal) {
                    return false;
                }
            }

            if (!this._skipDropdownCloseCleanup) {
                this._cleanup();
            }
            this._skipDropdownCloseCleanup = false;

            this.onClose();
            this.set('isClosing', true);

            return true;
        },

        publishFromShortcut() {
            // trigger blur for inputs and textareas to trigger any actions
            // before attempting to save so we're saving after the result
            if (document.activeElement?.matches('input[type="text"], textarea')) {
                // trigger focusout so that it bubbles
                const focusout = new Event('focusout');
                document.activeElement.dispatchEvent(focusout);

                // make sure blur event is triggered too
                document.activeElement.blur();
            }

            // wait for actions to be triggered by the focusout/blur before saving
            schedule('actions', this, function () {
                this.send('setSaveType', 'publish');
                this.save.perform();
            });
        }
    },

    get availableNewsletters() {
        return this.store.peekAll('newsletter').filter(n => n.status === 'active');
    },

    updateSaveTypeForPostStatus(status) {
        if (status === 'draft' || status === 'published') {
            this.set('saveType', 'publish');
        }
        if (status === 'scheduled') {
            this.set('saveType', 'schedule');
        }
    },

    setDefaultSendEmailWhenPublished() {
        if (this.isSendingEmailLimited) {
            this.set('sendEmailWhenPublished', false);
        } else if (this.postStatus === 'draft' && this.canSendEmail) {
            // Set default newsletter recipients
            this.set('sendEmailWhenPublished', this.defaultEmailRecipients);
        } else {
            this.set('sendEmailWhenPublished', this.post.emailRecipientFilter);
        }
    },

    checkIsSendingEmailLimitedTask: task(function* () {
        try {
            yield this.reloadSettingsTask.perform();

            if (this.limit.limiter && this.limit.limiter.isLimited('emails')) {
                yield this.limit.limiter.errorIfWouldGoOverLimit('emails');
            } else if (this.settings.get('emailVerificationRequired')) {
                this.set('isSendingEmailLimited', true);
                this.set('sendingEmailLimitError', 'Email sending is temporarily disabled because your account is currently in review. You should have an email about this from us already, but you can also reach us any time at support@ghost.org.');
                this.set('sendEmailWhenPublished', 'none');
                return;
            }

            this.set('isSendingEmailLimited', false);
            this.set('sendingEmailLimitError', null);
        } catch (error) {
            this.set('isSendingEmailLimited', true);
            this.set('sendingEmailLimitError', error.message);
            this.set('sendEmailWhenPublished', 'none');
        }
    }),

    reloadSettingsTask: task(function* () {
        yield this.settings.reload();
    }),

    save: task(function* (options = {}) {
        const {post, saveType} = this;

        // don't allow save if an invalid schedule date is present
        if (this.typedDateError) {
            return false;
        }

        // validate publishedAtBlog to avoid an alert when saving for already displayed errors
        // important to do this before opening email confirmation modal too
        try {
            yield post.validate({property: 'publishedAtBlog'});
        } catch (error) {
            // re-throw if we don't have a validation error
            if (error) {
                throw error;
            }
            return false;
        }

        const isPublishOnly = this.distributionAction === 'publish'
            || this.sendEmailWhenPublished === 'none'
            || this.post.displayName === 'page'
            || this.post.email;

        // open publish confirmation if post will be published/scheduled and emailed
        if (!isPublishOnly && post.status === 'draft' && (saveType === 'publish' || saveType === 'schedule')) {
            if (options.dropdown) {
                this._skipDropdownCloseCleanup = true;
                options.dropdown.actions.close();
            }

            return yield this.modals.open(ConfirmPublishModal, {
                post: this.post,
                emailOnly: this.emailOnly,
                sendEmailWhenPublished: this.sendEmailWhenPublished,
                newsletter: this.selectedNewsletter,
                isScheduled: saveType === 'schedule',
                confirm: this.saveWithConfirmedPublish.perform,
                retryEmailSend: this.retryEmailSendTask.perform
            }, {
                beforeClose: bind(this, this._cleanup)
            });
        }

        return yield this._saveTask.perform(options);
    }),

    saveWithConfirmedPublish: task(function* () {
        return yield this._saveTask.perform();
    }),

    retryEmailSendTask: task(function* () {
        if (!this.post.email) {
            return;
        }

        let email = yield this.post.email.retry();

        let pollTimeout = 0;
        if (email && email.status !== 'submitted') {
            while (pollTimeout < CONFIRM_EMAIL_MAX_POLL_LENGTH) {
                yield timeout(CONFIRM_EMAIL_POLL_LENGTH);
                pollTimeout += CONFIRM_EMAIL_POLL_LENGTH;

                email = yield email.reload();

                if (email.status === 'submitted') {
                    break;
                }
                if (email.status === 'failed') {
                    throw new EmailFailedError(email.error);
                }
            }
        }

        return email;
    }),

    selectNewsletter: action(function (newsletter) {
        this.set('selectedNewsletter', newsletter);
    }),

    fetchNewslettersTask: task(function* () {
        const newsletters = yield this.store.query('newsletter', {
            filter: 'status:active',
            order: 'sort_order ASC'
        });

        const defaultNewsletter = newsletters.toArray()[0];

        this.defaultNewsletter = defaultNewsletter;
        this.set('selectedNewsletter', defaultNewsletter);
    }),

    _saveTask: task(function* () {
        let {
            post,
            emailOnly,
            sendEmailWhenPublished,
            saveType
        } = this;

        // runningText needs to be declared before the other states change during the
        // save action.
        this.set('runningText', this._runningText);
        this.set('_previousStatus', this.get('post.status'));
        this.setSaveType(saveType);

        try {
            // will show alert for non-date related failed validations
            post = yield this.saveTask.perform({sendEmailWhenPublished, newsletterId: this.selectedNewsletter?.id, emailOnly});

            this._cachePublishedAtBlogTZ();

            if (sendEmailWhenPublished && sendEmailWhenPublished !== 'none') {
                let pollTimeout = 0;
                if (post.email && post.email.status !== 'submitted') {
                    while (pollTimeout < CONFIRM_EMAIL_MAX_POLL_LENGTH) {
                        yield timeout(CONFIRM_EMAIL_POLL_LENGTH);
                        pollTimeout += CONFIRM_EMAIL_POLL_LENGTH;

                        post = yield post.reload();

                        if (post.email.status === 'submitted') {
                            break;
                        }
                        if (post.email.status === 'failed') {
                            throw new EmailFailedError(post.email.error);
                        }
                    }
                }
            }

            this._cleanup();

            return post;
        } catch (error) {
            // re-throw if we don't have a validation error
            if (error) {
                throw error;
            }
        }
    }),

    _cachePublishedAtBlogTZ() {
        this._publishedAtBlogTZ = this.get('post.publishedAtBlogTZ');
    },

    _cleanup() {
        this.set('selectedNewsletter', this.defaultNewsletter);

        if (this.post.isScheduled && this.post.emailOnly) {
            this.set('distributionAction', 'send');
        } else if (this.post.isPage || !this.defaultEmailRecipients) {
            this.set('distributionAction', 'publish');
        } else {
            this.set('distributionAction', 'publish_send');
        }

        this.updateSaveTypeForPostStatus(this.post.status);

        // when closing the menu we reset the publishedAtBlogTZ date so that the
        // unsaved changes made to the scheduled date aren't reflected in the PSM
        this.post.set('publishedAtBlogTZ', this._publishedAtBlogTZ);

        this.post.set('statusScratch', null);
        this.post.validate();
    }
});
