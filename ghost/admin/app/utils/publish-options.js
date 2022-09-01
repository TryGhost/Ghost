import moment from 'moment';
import {action, get} from '@ember/object';
import {task} from 'ember-concurrency';
import {tracked} from '@glimmer/tracking';

export default class PublishOptions {
    // passed in services
    config = null;
    limit = null;
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
        return this.publishType !== 'publish'
            && this.recipientFilter
            && this.post.isDraft
            && !this.post.email;
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
        return moment.utc().add(5, 'minutes').milliseconds(0);
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
        // API only stores seconds so providing non-zero milliseconds can
        // trigger unexpected validation when updating scheduled posts
        date = moment.utc(date).milliseconds(0);

        if (date.isBefore(this.minScheduledAt)) {
            this.scheduledAtUTC = this.minScheduledAt;
            return;
        }

        this.scheduledAtUTC = date;
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
    @tracked emailDisabledError;

    get publishTypeOptions() {
        return [{
            value: 'publish+send', // internal
            label: 'Publish and email', // shown in expanded options
            display: 'Publish and email', // shown in option title
            disabled: this.emailDisabled
        }, {
            value: 'publish',
            label: 'Publish only',
            display: 'Publish'
        }, {
            value: 'send',
            label: 'Email only',
            display: 'Email',
            disabled: this.emailDisabled
        }];
    }

    get selectedPublishTypeOption() {
        return this.publishTypeOptions.find(pto => pto.value === this.publishType);
    }

    get emailDisabledInSettings() {
        return get(this.settings, 'editorDefaultEmailRecipients') === 'disabled'
            || get(this.settings, 'membersSignupAccess') === 'none';
    }

    // publish type dropdown is not shown at all
    get emailUnavailable() {
        return this.post.isPage || this.post.email || this.emailDisabledInSettings;
    }

    // publish type dropdown is shown but email options are disabled
    get emailDisabled() {
        const hasNoMembers = this.totalMemberCount === 0;

        return !this.mailgunIsConfigured || hasNoMembers || this.emailDisabledError;
    }

    get mailgunIsConfigured() {
        return get(this.settings, 'mailgunIsConfigured')
            || get(this.config, 'mailgunIsConfigured');
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
    @tracked selectedRecipientFilter = undefined;

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

    get recipientFilter() {
        return this.selectedRecipientFilter === undefined ? this.defaultRecipientFilter : this.selectedRecipientFilter;
    }

    get defaultRecipientFilter() {
        const recipients = this.settings.get('editorDefaultEmailRecipients');
        const filter = this.settings.get('editorDefaultEmailRecipientsFilter');

        const usuallyNobody = recipients === 'filter' && filter === null;

        if (recipients === 'disabled') {
            return null;
        }

        if (recipients === 'visibility' || usuallyNobody) {
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

        return filter;
    }

    get fullRecipientFilter() {
        let filter = this.newsletter.recipientFilter;

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
        this.selectedRecipientFilter = newFilter;
    }

    // setup -------------------------------------------------------------------

    constructor({config, limit, post, settings, store, user} = {}) {
        this.config = config;
        this.limit = limit;
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

        // When default recipients is set to "Usually nobody":
        // Set publish type to "Publish" but keep email recipients matching post visibility
        // to avoid multiple clicks to turn on emailing
        if (
            this.settings.get('editorDefaultEmailRecipients') === 'filter' &&
            this.settings.get('editorDefaultEmailRecipientsFilter') === null
        ) {
            this.publishType = 'publish';
        }
    }

    @task
    *fetchRequiredDataTask() {
        const promises = [];

        // total # of members - used to enable/disable email
        // Only Admins/Owners have permission to browse members and get a count
        // for Editors/Authors set member count to 1 so email isn't disabled for not having any members
        if (this.user.isAdmin) {
            promises.push(this.store.query('member', {limit: 1}).then((res) => {
                this.totalMemberCount = res.meta.pagination.total;
            }));
        } else {
            this.totalMemberCount = 1;
        }

        // email limits
        promises.push(this._checkSendingLimit());
        // newsletters
        promises.push(this.store.query('newsletter', {status: 'active', limit: 'all', include: 'count.members'}));

        yield Promise.all(promises);
    }

    // saving ------------------------------------------------------------------

    @task({drop: true})
    *saveTask() {
        // willEmail can change after model changes are applied because the post
        // can leave draft status - grab it now before that happens
        const willEmail = this.willEmail;

        this._applyModelChanges();

        const adapterOptions = {};

        if (willEmail) {
            adapterOptions.newsletter = this.newsletter.slug;
            adapterOptions.emailSegment = this.recipientFilter;
        }

        try {
            return yield this.post.save({adapterOptions});
        } catch (e) {
            this._revertModelChanges();
            throw e;
        }
    }

    @task({drop: true})
    *revertToDraftTask() {
        const originalStatus = this.post.status;
        const originalPublishedAtUTC = this.post.publishedAtUTC;

        try {
            if (this.post.isScheduled) {
                this.post.publishedAtUTC = null;
            }

            this.post.status = 'draft';

            return yield this.post.save();
        } catch (e) {
            this.post.status = originalStatus;
            this.post.publishedAtUTC = originalPublishedAtUTC;
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
        const willEmail = this.willEmail;

        // store backup of original values in case we need to revert
        this._originalModelValues = {};

        // this only applies to the full publish flow which is only available for drafts
        if (!this.post.isDraft) {
            return;
        }

        const revertableModelProperties = ['status', 'publishedAtUTC', 'emailOnly'];

        revertableModelProperties.forEach((property) => {
            this._originalModelValues[property] = this.post[property];
        });

        this.post.status = this.isScheduled ? 'scheduled' : 'published';

        if (this.isScheduled) {
            this.post.publishedAtUTC = this.scheduledAtUTC;
        }

        if (willEmail) {
            this.post.emailOnly = this.publishType === 'send';
        }
    }

    _revertModelChanges() {
        Object.keys(this._originalModelValues).forEach((property) => {
            this.post[property] = this._originalModelValues[property];
        });
    }

    async _checkSendingLimit() {
        await this.settings.reload();

        try {
            if (this.limit.limiter && this.limit.limiter.isLimited('emails')) {
                await this.limit.limiter.errorIfWouldGoOverLimit('emails');
            } else if (get(this.settings, 'emailVerificationRequired')) {
                this.emailDisabledError = 'Email sending is temporarily disabled because your account is currently in review. You should have an email about this from us already, but you can also reach us any time at support@ghost.org.';
            }
        } catch (e) {
            this.emailDisabledError = e.message;
        }
    }
}
