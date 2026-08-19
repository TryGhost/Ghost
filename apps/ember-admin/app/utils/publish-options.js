import moment from 'moment-timezone';
import {PREVIEW_SEGMENT, hasEmailAudienceSplit, segmentParts} from 'ghost-admin/utils/email-audience-segments';
import {action} from '@ember/object';
import {getPublicPreviewWarning} from 'ghost-admin/utils/public-preview-warning';
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
                // the union, so a send that's only a preview still counts as email
                && this.combinedRecipientFilter
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

    get publicPreviewWarning() {
        return getPublicPreviewWarning(this.post);
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

    // Whether a paywall card gates the post, which is what makes a preview
    // worth offering and gives it its own step
    get hasAudienceSplit() {
        return hasEmailAudienceSplit(this.post);
    }

    // --- the preview audience -------------------------------------------------
    //
    // Tracked apart from `recipientFilter` rather than mixed into it, because
    // the two questions are asked separately and the answer to the first
    // decides what the second may contain. A single filter couldn't tell
    // "chosen to receive the post" from "chosen to receive the teaser".

    @tracked selectedPreviewFilter = undefined;
    @tracked availableTiers = [];

    /**
     * Whoever the full send already reaches, and so can't be a preview
     * recipient.
     *
     * Segment names aren't independent - "paid members" contains every tier -
     * so a tier in the full send takes "paid members" off the table and vice
     * versa. Labels can't be reasoned about: one may hold anyone, and the
     * renderer gates per-recipient regardless.
     */
    get previewHiddenSegments() {
        const fullSegments = segmentParts(this.recipientFilter);
        const hidden = new Set(fullSegments);

        const includesPaid = fullSegments.includes('status:-free');
        const includesTier = fullSegments.some(segment => segment.startsWith('tier:'));

        if (includesPaid || includesTier) {
            hidden.add('status:-free');
        }

        if (includesPaid) {
            this.availableTiers.forEach(tier => hidden.add(`tier:${tier.slug}`));
        }

        return [...hidden];
    }

    /**
     * Everyone the full send left out - the preview audience unless the author
     * says otherwise, and what makes the two add up to the whole newsletter.
     *
     * One definition, used both for the value the step lands on and for the one
     * answering "yes" restores. They were computed separately at first, and
     * drifted: landing on the step gave free members only, while toggling gave
     * free members plus every tier the post skipped.
     *
     * Labels aren't guessed at - they're the author's own grouping, and adding
     * one on their behalf would pick an audience they never asked for.
     */
    get defaultPreviewFilter() {
        if (!this.hasAudienceSplit) {
            return null;
        }

        const taken = this.previewHiddenSegments;

        const candidates = [
            PREVIEW_SEGMENT,
            'status:-free',
            ...this.availableTiers.map(tier => `tier:${tier.slug}`)
        ];

        const remaining = candidates.filter(segment => !taken.includes(segment));

        // a tier is only worth naming when "paid members" didn't already cover
        // it, otherwise the same people arrive twice over
        const segments = remaining.includes('status:-free')
            ? remaining.filter(segment => !segment.startsWith('tier:'))
            : remaining;

        return segments.join(',') || null;
    }

    get previewFilter() {
        return this.selectedPreviewFilter === undefined ? this.defaultPreviewFilter : this.selectedPreviewFilter;
    }

    // What the send is actually built from: both audiences unioned, exactly the
    // shape a single recipient picker has always produced. The renderer decides
    // per-recipient which version of the post to build.
    get combinedRecipientFilter() {
        const segments = [this.recipientFilter, this.previewFilter]
            .filter(Boolean)
            .join(',')
            .split(',')
            .map(segment => segment.trim())
            .filter(Boolean);

        return [...new Set(segments)].join(',') || null;
    }

    /**
     * Names the preview audience in a phrase short enough to sit in a sentence.
     *
     * A single tier is worth naming - "Bronze" says more than "1 tier". Past
     * one, and for labels at any number, they're counted instead: spelling out
     * a combination turns a line meant to reassure into one to decode.
     *
     * Lives here rather than on the step so the review can say the same thing
     * the step did, in the same words.
     */
    get previewAudienceLabel() {
        const segments = segmentParts(this.previewFilter);

        if (!segments.length) {
            return null;
        }

        const hasFree = segments.includes(PREVIEW_SEGMENT);
        const hasPaid = segments.includes('status:-free');
        const tiers = segments.filter(segment => segment.startsWith('tier:'));

        if (segments.length === 1) {
            if (hasFree) {
                return 'free members';
            }

            if (hasPaid) {
                return 'paid members';
            }

            // "674 Bronze members", not "674 Bronze" - the tier name keeps its
            // own casing as a proper noun, but still needs a noun after it
            if (tiers.length === 1) {
                const slug = tiers[0].slice('tier:'.length);
                const name = this.availableTiers.find(tier => tier.slug === slug)?.name || slug;

                return `${name} members`;
            }
        }

        // bare "members" so it reads after a number - "674 all members" doesn't
        if (segments.length === 2 && hasFree && hasPaid) {
            return 'members';
        }

        return 'selected members';
    }

    // Counted apart from each other so the review can say who gets the post and
    // who gets the teaser, rather than one number covering both
    get postRecipientFilter() {
        return this._scopedToNewsletter(this.recipientFilter);
    }

    get previewRecipientFilter() {
        return this._scopedToNewsletter(this.previewFilter);
    }

    // parenthesised because a segment list is comma-joined and NQL binds `+`
    // tighter than `,` - without it the newsletter would only apply to the first
    _scopedToNewsletter(filter) {
        if (!filter) {
            return null;
        }

        return this.newsletter ? `${this.newsletter.recipientFilter}+(${filter})` : filter;
    }

    @action
    setPreviewFilter(newFilter) {
        this.selectedPreviewFilter = newFilter;
    }

    get fullRecipientFilter() {
        let filter = this.newsletter.recipientFilter;

        if (this.combinedRecipientFilter) {
            filter += `+(${this.combinedRecipientFilter})`;
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

        // paid tiers - the preview audience is worked out from who the full
        // send left out, which means knowing every tier there is. The free tier
        // isn't something a paywall can gate on, so it's not fetched.
        if (!this.user.isContributor) {
            promises.push(this.store.query('tier', {filter: 'type:paid', limit: 'all'}).then((tiers) => {
                this.availableTiers = tiers.toArray ? tiers.toArray() : [...tiers];
            }));
        }

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
            // both audiences, as one segment - the split is a question the UI
            // asks, not something the send needs to know about
            adapterOptions.emailSegment = this.combinedRecipientFilter;
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
