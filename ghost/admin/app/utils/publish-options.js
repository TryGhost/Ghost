import moment from 'moment-timezone';
import {action} from '@ember/object';
import {getPagePlacement, pagePathForSlug, setPageNavigationPlacement} from 'ghost-admin/utils/site-navigation';
import {htmlSafe} from '@ember/template';
import {task} from 'ember-concurrency';
import {tracked} from '@glimmer/tracking';

export default class PublishOptions {
    // passed in services
    config = null;
    limit = null;
    settings = null;
    store = null;
    membersCountCache = null;

    // passed in models
    post = null;
    user = null;

    @tracked publishDisabledError = null;
    @tracked totalMemberCount = 0;

    get isLoading() {
        return this.setupTask.isRunning;
    }

    get willEmail() {
        return (
            (this.publishType !== 'publish'
                && this.recipientFilter
                && this.post.isDraft
                && !this.post.email
            )
                || (this.post.isDraft && this.post.email && this.post.email.status === 'failed')
        );
    }

    get willEmailImmediately() {
        return this.willEmail && !this.isScheduled;
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
        return moment.utc().add(5, 'seconds').milliseconds(0);
    }

    get defaultScheduledAt() {
        return moment.utc().add(10, 'minutes').milliseconds(0);
    }

    @action
    toggleScheduled(shouldSchedule) {
        if (shouldSchedule === undefined) {
            shouldSchedule = !this.isScheduled;
        }

        this.isScheduled = shouldSchedule;

        if (shouldSchedule && (!this.scheduledAtUTC || this.scheduledAtUTC.isBefore(this.defaultScheduledAt))) {
            this.scheduledAtUTC = this.defaultScheduledAt;
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

    // navigation ----------------------------------------------------------
    // pages are not linked from anywhere on a site by default so when
    // publishing a page we let the user place it in the site navigation. The
    // picker reflects the page's current placement so it can be added, moved
    // between menus, or removed - not just added.

    // the user's explicit picker selection (none/primary/secondary), or
    // undefined when they haven't touched it - in which case the picker
    // reflects the page's live current placement so it always matches the
    // settings menu / pages list, even if those changed it
    @tracked navigationPlacementOverride = undefined;
    // true when the most recent saveTask attempted a navigation change that
    // failed to save - reset at the start of every saveTask so it never leaks
    // a stale failure into a later publish
    @tracked navigationSaveFailed = false;

    get pageNavigationPath() {
        return pagePathForSlug(this.post.slug, this.config.blogUrl);
    }

    get currentNavigationPlacement() {
        if (!this.post.isPage || !this.pageNavigationPath) {
            return null;
        }

        return getPagePlacement(this.settings, this.pageNavigationPath, this.config.blogUrl);
    }

    get navigationPlacement() {
        if (this.navigationPlacementOverride !== undefined) {
            return this.navigationPlacementOverride;
        }

        return this.currentNavigationPlacement ?? 'none';
    }

    // only admins/owners can edit the navigation settings, and a link to a
    // not-yet-published page would 404 so scheduling hides the option
    get showNavigationOption() {
        return this.post.isPage &&
            !!this.user.isAdmin &&
            !this.isScheduled &&
            !!this.pageNavigationPath;
    }

    get desiredNavigationPlacement() {
        return this.navigationPlacement === 'none' ? null : this.navigationPlacement;
    }

    get navigationOptions() {
        return [{
            value: 'none',
            label: 'None', // shown in expanded options (pill)
            display: 'Not in site navigation' // shown in collapsed option title
        }, {
            value: 'primary',
            label: 'Primary',
            display: 'Primary navigation'
        }, {
            value: 'secondary',
            label: 'Secondary',
            display: 'Secondary navigation'
        }];
    }

    get selectedNavigationOption() {
        return this.navigationOptions.find(o => o.value === this.navigationPlacement);
    }

    @action
    setNavigationPlacement(placement) {
        this.navigationPlacementOverride = placement;
    }

    // discards an unsaved picker selection so the flow always reopens showing
    // the page's real current placement, not a change that was never published
    @action
    resetNavigationPlacement() {
        this.navigationPlacementOverride = undefined;
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
        return this.settings.editorDefaultEmailRecipients === 'disabled'
            || this.settings.membersSignupAccess === 'none';
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
        return this.settings.mailgunIsConfigured
            || this.config.mailgunIsConfigured;
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
        if (this.selectedRecipientFilter === undefined) {
            return (this.post.newsletter && this.post.emailSegment) || this.defaultRecipientFilter;
        } else {
            return this.selectedRecipientFilter;
        }
    }

    get defaultRecipientFilter() {
        const recipients = this.settings.editorDefaultEmailRecipients;
        const filter = this.settings.editorDefaultEmailRecipientsFilter;

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

    constructor({config, limit, post, settings, store, user, membersCountCache} = {}) {
        this.config = config;
        this.limit = limit;
        this.post = post;
        this.settings = settings;
        this.store = store;
        this.user = user;
        this.membersCountCache = membersCountCache;

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
            this.settings.editorDefaultEmailRecipients === 'filter' &&
            this.settings.editorDefaultEmailRecipientsFilter === null
        ) {
            this.publishType = 'publish';
        }

        if (this.post.isSent) {
            this.publishType = 'send';
        }
    }

    @task
    *fetchRequiredDataTask() {
        const promises = [];

        // total # of members - used to enable/disable email
        // Only Admins/Owners have permission to browse members and get a count
        // for Editors/Authors set member count to 1 so email isn't disabled for not having any members
        if (this.user.isAdmin) {
            promises.push(this.membersCountCache.count({}).then((res) => {
                this.totalMemberCount = res;
            }));
        } else {
            this.totalMemberCount = 1;
        }

        // limits
        promises.push(this._checkSendingLimit());
        promises.push(this._checkPublishingLimit());

        // newsletters
        if (!this.user.isContributor) {
            promises.push(this.store.query('newsletter', {status: 'active', limit: 'all', include: 'count.active_members'}));
        }

        yield Promise.all(promises);
    }

    // saving ------------------------------------------------------------------

    @task({drop: true})
    *saveTask() {
        // willEmail can change after model changes are applied because the post
        // can leave draft status - grab it now before that happens
        const willEmail = this.willEmail;
        // capture before model changes flip the post to published. We only
        // touch settings when the chosen placement actually differs, so a plain
        // republish never re-saves navigation
        const navigationPlacementChanged = this.showNavigationOption
            && this.desiredNavigationPlacement !== this.currentNavigationPlacement;

        // clear any failure from a previous save so it can't leak into this one
        this.navigationSaveFailed = false;

        this._applyModelChanges();

        const adapterOptions = {};

        if (willEmail) {
            adapterOptions.newsletter = this.newsletter.slug;
            adapterOptions.emailSegment = this.recipientFilter;
        }

        let result;
        try {
            result = yield this.post.save({adapterOptions});
        } catch (e) {
            this._revertModelChanges();
            throw e;
        }

        // the page is published at this point so a navigation failure should
        // never fail the publish - the failure is surfaced separately
        if (navigationPlacementChanged && this.post.isPublished) {
            try {
                yield setPageNavigationPlacement(this.settings, {
                    label: this.post.title,
                    path: this.pageNavigationPath,
                    placement: this.desiredNavigationPlacement,
                    blogUrl: this.config.blogUrl
                });
            } catch (e) {
                this.navigationSaveFailed = true;
            }
        }

        return result;
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
            this.post.emailOnly = false;

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
            } else if (this.settings.emailVerificationRequired) {
                this.emailDisabledError = this.config.hostSettings?.emailVerification?.emailSendingDisabledMessage
                    || 'Email sending is temporarily disabled because your account is currently in review. You should have an email about this from us already, but you can also reach us any time at support@ghost.org.';
            }
        } catch (e) {
            this.emailDisabledError = e.message;
        }
    }

    async _checkPublishingLimit() {
        // non-admin users cannot fetch members count so we can't error at this stage for them
        if (!this.user.isAdmin) {
            return;
        }

        try {
            if (this.limit.limiter?.isLimited('members')) {
                await this.limit.limiter.errorIfIsOverLimit('members');
            }
        } catch (e) {
            const linkedMessage = htmlSafe(e.message.replace(/please upgrade/i, '<a href="#/pro">$&</a>'));
            this.publishDisabledError = linkedMessage;
        }
    }
}
