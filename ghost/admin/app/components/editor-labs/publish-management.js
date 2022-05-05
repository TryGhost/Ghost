import Component from '@glimmer/component';
import EmailFailedError from 'ghost-admin/errors/email-failed-error';
import PublishFlowModal from './modals/publish-flow';
import PublishOptionsResource from 'ghost-admin/helpers/publish-options';
import moment from 'moment';
import {action, get} from '@ember/object';
import {inject as service} from '@ember/service';
import {task, timeout} from 'ember-concurrency';
import {tracked} from '@glimmer/tracking';
import {use} from 'ember-could-get-used-to-this';

const CONFIRM_EMAIL_POLL_LENGTH = 1000;
const CONFIRM_EMAIL_MAX_POLL_LENGTH = 15 * 1000;

export class PublishOptions {
    // passed in services
    config = null;
    settings = null;
    store = null;

    // passed in models
    post = null;
    user = null;

    @tracked totalMemberCount = 0;

    get isLoading() {
        return this.setupTask.isRunning;
    }

    get willEmail() {
        return this.publishType !== 'publish' && this.recipientFilter;
    }

    get willPublish() {
        return this.publishType !== 'send';
    }

    get willOnlyEmail() {
        return this.publishType === 'send';
    }

    // publish date ------------------------------------------------------------

    @tracked isScheduled = false;
    @tracked scheduledAtUTC = this.minScheduledAt;

    get minScheduledAt() {
        return moment.utc().add(5, 'minutes');
    }

    @action
    toggleScheduled(shouldSchedule) {
        if (shouldSchedule === undefined) {
            shouldSchedule = !this.isScheduled;
        }

        this.isScheduled = shouldSchedule;

        if (shouldSchedule && (!this.scheduledAtUTC || this.scheduledAtUTC.isBefore(this.minScheduledAt))) {
            this.scheduledAtUTC = this.minScheduledAt;
        }
    }

    @action
    setScheduledAt(date) {
        if (moment.utc(date).isBefore(this.minScheduledAt)) {
            return;
        }

        this.scheduledAtUTC = moment.utc(date);
    }

    @action
    resetPastScheduledAt() {
        if (this.scheduledAtUTC.isBefore(this.minScheduledAt)) {
            this.isScheduled = false;
            this.scheduledAt = null;
        }
    }

    // publish type ------------------------------------------------------------

    @tracked publishType = 'publish+send';

    get publishTypeOptions() {
        return [{
            value: 'publish+send', // internal
            label: 'Publish and email', // shown in expanded options
            display: 'Publish and email', // shown in option title
            confirmButton: 'Yes, publish and send', // shown in confirm step
            disabled: this.emailDisabled
        }, {
            value: 'publish',
            label: 'Publish only',
            display: 'Publish',
            confirmButton: 'Yes, publish on site'
        }, {
            value: 'send',
            label: 'Email only',
            display: 'Email',
            confirmButton: 'Yes, send by email',
            disabled: this.emailDisabled
        }];
    }

    get selectedPublishTypeOption() {
        return this.publishTypeOptions.find(pto => pto.value === this.publishType);
    }

    // publish type dropdown is not shown at all
    get emailUnavailable() {
        const emailDisabled = get(this.settings, 'editorDefaultEmailRecipients') === 'disabled'
            || get(this.settings, 'membersSignupAccess') === 'none';

        return this.post.isPage || this.post.email || !this.user.canEmail || emailDisabled;
    }

    // publish type dropdown is shown but email options are disabled
    get emailDisabled() {
        const mailgunIsNotConfigured = !get(this.settings, 'mailgunIsConfigured')
            && !get(this.config, 'mailgunIsConfigured');

        const hasNoMembers = this.totalMemberCount === 0;

        // TODO: check email limit

        return mailgunIsNotConfigured || hasNoMembers;
    }

    @action
    setPublishType(newValue) {
        // TODO: validate option is allowed when setting?
        this.publishType = newValue;
    }

    // recipients --------------------------------------------------------------

    // set in constructor because services are not injected
    allNewsletters = [];

    // both of these are set to site defaults in `setupTask`
    @tracked newsletter = null;
    @tracked recipientFilter = 'status:free,status:-free';

    get newsletters() {
        return this.allNewsletters
            .filter(n => n.status === 'active')
            .sort(({sortOrder: a}, {sortOrder: b}) => a - b);
    }

    get defaultNewsletter() {
        return this.newsletters[0];
    }

    get onlyDefaultNewsletter() {
        return this.newsletters.length === 1;
    }

    get fullRecipientFilter() {
        let filter = `newsletters:${this.newsletter.slug}`;

        if (this.recipientFilter) {
            filter += `+(${this.recipientFilter})`;
        }

        return filter;
    }

    @action
    setNewsletter(newsletter) {
        this.newsletter = newsletter;
    }

    @action
    setRecipientFilter(newFilter) {
        this.recipientFilter = newFilter;
    }

    // setup -------------------------------------------------------------------

    constructor({config, post, settings, store, user} = {}) {
        this.config = config;
        this.post = post;
        this.settings = settings;
        this.store = store;
        this.user = user;

        // this needs to be set here rather than a class-level property because
        // unlike Ember-based classes the services are not injected so can't be
        // used until after they are assigned above
        this.allNewsletters = this.store.peekAll('newsletter');

        this.setupTask.perform();
    }

    @task
    *setupTask() {
        yield this.fetchRequiredDataTask.perform();

        // TODO: set up initial state / defaults

        this.newsletter = this.defaultNewsletter;

        if (this.emailUnavailable || this.emailDisabled) {
            this.publishType = 'publish';
        }
    }

    @task
    *fetchRequiredDataTask() {
        // total # of members - used to enable/disable email
        const countTotalMembers = this.store.query('member', {limit: 1}).then((res) => {
            this.totalMemberCount = res.meta.pagination.total;
        });

        // email limits
        // TODO: query limit service

        // newsletters
        const fetchNewsletters = this.store.query('newsletter', {status: 'active', limit: 'all'});

        yield Promise.all([countTotalMembers, fetchNewsletters]);
    }

    // saving ------------------------------------------------------------------

    revertableModelProperties = ['status', 'publishedAtUTC', 'emailOnly'];

    @task({drop: true})
    *saveTask() {
        this._applyModelChanges();

        const adapterOptions = {};

        if (this.willEmail) {
            adapterOptions.newsletterId = this.newsletter.id;
            adapterOptions.emailRecipientFilter = this.recipientFilter;
        }

        try {
            return yield this.post.save({adapterOptions});
        } catch (e) {
            this._revertModelChanges();
            throw e;
        }
    }

    // Publishing/scheduling is a side-effect of changing model properties.
    // We don't want to get into a situation where we've applied these changes
    // but they haven't been saved because that would result in confusing UI.
    //
    // Here we apply those changes from the selected publish options but keep
    // track of the previous values in case saving fails. We can't use ED's
    // rollbackAttributes() because it would also rollback any other unsaved edits
    _applyModelChanges() {
        // store backup of original values in case we need to revert
        this._originalModelValues = {};
        this.revertableModelProperties.forEach((property) => {
            this._originalModelValues[property] = this.post[property];
        });

        this.post.status = this.isScheduled ? 'scheduled' : 'published';

        if (this.post.isScheduled) {
            this.post.publishedAtUTC = this.scheduledAtUTC;
        }

        this.post.emailOnly = this.publishType === 'email';
    }

    _revertModelChanges() {
        this.revertableModelProperties.forEach((property) => {
            this.post[property] = this._originalModelValues[property];
        });
    }
}

/* Component -----------------------------------------------------------------*/

// This component exists for the duration of the editor screen being open.
// It's used to store the selected publish options and control the
// publishing flow modal.
export default class PublishManagement extends Component {
    @service modals;

    // ensure we get a new PublishOptions instance when @post is replaced
    @use publishOptions = new PublishOptionsResource(() => [this.args.post]);

    publishFlowModal = null;

    willDestroy() {
        super.willDestroy(...arguments);
        this.publishFlowModal?.close();
    }

    @action
    openPublishFlow(event) {
        event?.preventDefault();

        if (!this.publishFlowModal || this.publishFlowModal.isClosing) {
            this.publishOptions.resetPastScheduledAt();

            this.publishFlowModal = this.modals.open(PublishFlowModal, {
                publishOptions: this.publishOptions,
                saveTask: this.saveTask
            });
        }
    }

    @task
    *saveTask() {
        // clean up blank editor cards
        // apply cloned mobiledoc
        // apply scratch values
        // generate slug if needed (should never happen - publish flow can't be opened on new posts)
        yield this.args.beforeSave();

        // apply publish options (with undo on failure)
        // save with the required query params for emailing
        const result = yield this.publishOptions.saveTask.perform();

        // perform any post-save cleanup for the editor
        yield this.args.afterSave(result);

        // if emailed, wait until it has been submitted so we can show a failure message if needed
        if (this.publishOptions.post.email) {
            yield this.confirmEmailTask.perform();
        }

        return result;
    }

    @task
    *confirmEmailTask() {
        const post = this.publishOptions.post;

        let pollTimeout = 0;
        if (post.email && post.email.status !== 'submitted') {
            while (pollTimeout < CONFIRM_EMAIL_MAX_POLL_LENGTH) {
                yield timeout(CONFIRM_EMAIL_POLL_LENGTH);
                pollTimeout += CONFIRM_EMAIL_POLL_LENGTH;

                yield post.reload();

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
}
