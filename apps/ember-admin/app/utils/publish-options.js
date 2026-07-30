import moment from 'moment-timezone';
import {action} from '@ember/object';
import {htmlSafe} from '@ember/template';
import {task} from 'ember-concurrency';
import {tracked} from '@glimmer/tracking';

export default class PublishOptions {
    // passed in services
    config = null;
    feature = null;
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
        if (this.feature?.publishFlowRedesign) {
            return this.derivedRecipientFilter;
        }

        if (this.selectedRecipientFilter === undefined) {
            return (this.post.newsletter && this.post.emailSegment) || this.defaultRecipientFilter;
        } else {
            return this.selectedRecipientFilter;
        }
    }

    // publish flow redesign ---------------------------------------------------
    // email recipients are derived from post visibility plus explicit upsell
    // choices rather than picked with a segment select

    // Row choices follow the decision already made on the website step until
    // the writer overrides them: a post with a public preview sends it to the
    // people who can't read the rest, a post without one sends them nothing.
    // null = still following; true/false = the writer's own answer.
    @tracked upsellFreeMembersOverride = null;
    // per tier, because Bronze and Silver are different audiences even when
    // they receive the same body — keyed by slug, absent = still following
    @tracked otherTierOverrides = {};
    @tracked allPaidTiers = [];

    get upsellFreeMembers() {
        return this.upsellFreeMembersOverride === null
            ? this.hasPublicPreview
            : this.upsellFreeMembersOverride;
    }

    isOtherTierIncluded(slug) {
        const override = this.otherTierOverrides[slug];
        return override === undefined ? this.hasPublicPreview : override;
    }

    @action
    setOtherTierIncluded(slug, value) {
        this.otherTierOverrides = {...this.otherTierOverrides, [slug]: value};
    }

    get includedOtherTiers() {
        return this.otherPaidTiers.filter(t => this.isOtherTierIncluded(t.slug));
    }

    get upsellOtherTiers() {
        return this.includedOtherTiers.length > 0;
    }

    // a new audience makes the old per-group answers stale
    @action
    resetRowChoices() {
        this.upsellFreeMembersOverride = null;
        this.otherTierOverrides = {};
        this.setEmailBypassPaywall(false);
    }

    // audience set builder: 'all' sends to every newsletter subscriber the
    // leak guard allows; 'groups' sends to the union of selected sets
    @tracked audienceMode = 'all';
    @tracked selectedGroups = [];

    // set by the Website step from the editor's paywall position; null = unknown
    @tracked paywallIndex = null;
    @tracked blockCount = null;

    // a public preview only exists when at least one block sits above the cut —
    // without one, emailing non-audience members would send them the full post
    // (email truncation only happens at the paywall marker)
    get hasPublicPreview() {
        return typeof this.paywallIndex === 'number' && this.paywallIndex > 0;
    }

    // a deliberate, labelled leak: this send carries the full post to every
    // recipient, including members who can't read it on the site. Publishers
    // use it to put paid work in front of their whole list. Site access is
    // untouched — the page stays gated.
    get emailBypassPaywall() {
        return !!this.post.emailBypassPaywall;
    }

    @action
    setEmailBypassPaywall(value) {
        this.post.set('emailBypassPaywall', !!value);
    }

    // a group that can't read the post can still be sent something: the free preview
    // (needs a line in the post) or, deliberately, the whole thing
    get canIncludeNonAudience() {
        return this.hasPublicPreview || this.emailBypassPaywall;
    }

    get audienceSegment() {
        switch (this.post.visibility) {
        case 'paid':
            return 'status:-free';
        case 'tiers':
            return this.post.visibilitySegment;
        default:
            return 'status:free,status:-free';
        }
    }

    // tiers without access to this post. Only a tier-restricted post has any:
    // on a paid post every paid tier can read it, so there is no such group
    get otherPaidTiers() {
        if (this.post.visibility !== 'tiers') {
            return [];
        }

        const postTierSlugs = (this.post.tiers || []).map(t => t.slug);
        return this.allPaidTiers.filter(t => !postTierSlugs.includes(t.slug));
    }

    // Everyone this send is allowed to reach: the audience, plus each
    // non-audience group whose row sends them something. null when nothing is
    // excluded, so the selection passes through untouched.
    get allowedSegment() {
        const parts = [this.audienceSegment];
        let excludedSomething = false;

        if (this.canIncludeNonAudience) {
            for (const tier of this.otherPaidTiers) {
                if (this.isOtherTierIncluded(tier.slug)) {
                    parts.push(`tier:${tier.slug}`);
                } else {
                    excludedSomething = true;
                }
            }

            if (this.upsellFreeMembers) {
                parts.push('status:free');
            } else {
                excludedSomething = true;
            }
        } else {
            // no preview and no bypass: only the audience can be sent anything
            excludedSomething = true;
        }

        return excludedSomething ? parts.join(',') : null;
    }

    get selectionFilter() {
        if (!this.selectedGroups.length) {
            return null;
        }
        return this.selectedGroups.map(g => g.filter).join(',');
    }

    get derivedRecipientFilter() {
        const {visibility} = this.post;
        const restricted = visibility === 'paid' || visibility === 'tiers';

        if (this.audienceMode === 'groups' && this.selectionFilter) {
            // the selection says who was asked for; this says who may actually
            // be sent to. It covers both the leak guard (no preview, so only
            // the audience can receive anything) and rows set to Nothing.
            if (restricted && this.allowedSegment) {
                return `(${this.selectionFilter})+(${this.allowedSegment})`;
            }
            return this.selectionFilter;
        }

        // Everyone: exact strings preserved so the post adapter serializes
        // email_segment=all for the default case
        if (!restricted) {
            return 'status:free,status:-free';
        }

        if (visibility === 'paid') {
            return (this.canIncludeNonAudience && this.upsellFreeMembers)
                ? 'status:free,status:-free'
                : this.audienceSegment;
        }

        // tiers: the audience always gets the full post; other tiers and
        // free members join when their row sends them something
        const parts = [this.audienceSegment];

        if (this.canIncludeNonAudience && this.includedOtherTiers.length) {
            parts.push(this.includedOtherTiers.map(t => `tier:${t.slug}`).join(','));
        }

        if (this.canIncludeNonAudience && this.upsellFreeMembers) {
            parts.push('status:free');
        }

        return parts.join(',');
    }

    // outcome rows: who gets the full post vs the preview, within the
    // current selection
    // groups mode with nothing selected sends to no one — the outcome box
    // must reflect that instead of falling back to the Everyone counts
    get hasEmptySelection() {
        return this.audienceMode === 'groups' && !this.selectionFilter;
    }

    get fullPostCountFilter() {
        const base = this.audienceMode === 'groups' && this.selectionFilter
            ? `(${this.selectionFilter})+(${this.audienceSegment})`
            : `(${this.audienceSegment})`;
        return `${this.newsletter?.recipientFilter}+${base}`;
    }

    get previewCountFilter() {
        const base = this.audienceMode === 'groups' && this.selectionFilter
            ? `(${this.selectionFilter})+(status:free)`
            : `(status:free)`;
        return `${this.newsletter?.recipientFilter}+${base}`;
    }

    get selectionCountFilter() {
        const base = this.audienceMode === 'groups' && this.selectionFilter
            ? `(${this.selectionFilter})`
            : '(status:free,status:-free)';
        return `${this.newsletter?.recipientFilter}+${base}`;
    }

    @action
    setAudienceMode(mode) {
        this.audienceMode = mode;
    }

    @action
    addGroup(group) {
        if (!this.selectedGroups.some(g => g.filter === group.filter)) {
            this.selectedGroups = [...this.selectedGroups, group];
        }
    }

    @action
    removeGroup(filter) {
        this.selectedGroups = this.selectedGroups.filter(g => g.filter !== filter);
    }

    get audienceCountFilter() {
        return `${this.newsletter?.recipientFilter}+(${this.audienceSegment})`;
    }

    get freeUpsellCountFilter() {
        return `${this.newsletter?.recipientFilter}+(status:free)`;
    }

    get otherTiersCountFilter() {
        return this.countFilterForSegment(this.otherPaidTiers.map(t => `tier:${t.slug}`).join(','));
    }

    countFilterForTier(slug) {
        return this.countFilterForSegment(`tier:${slug}`);
    }

    countFilterForSegment(segment) {
        const base = this.audienceMode === 'groups' && this.selectionFilter
            ? `(${this.selectionFilter})+(${segment})`
            : `(${segment})`;
        return `${this.newsletter?.recipientFilter}+${base}`;
    }

    get otherTiersLabel() {
        return this.otherPaidTiers.map(t => t.name).join(', ');
    }

    // audienceDescription says who can READ; the email row needs who is
    // SUBSCRIBED — for public posts "812 everyone" is broken English
    get emailAudienceLabel() {
        return this.post.visibility === 'public' ? 'subscribers' : this.audienceDescription;
    }

    get audienceDescription() {
        switch (this.post.visibility) {
        case 'public':
            return 'everyone';
        case 'members':
            return 'members';
        case 'paid':
            return 'paid members';
        case 'tiers': {
            const names = (this.post.tiers || []).map(t => t.name);
            return names.length ? `${names.join(', ')} members` : 'selected tiers';
        }
        default:
            return 'a custom audience';
        }
    }

    // one row per audience group for the confirm step's who-gets-what card;
    // groups that get nothing are enumerated rather than omitted so silence
    // never hides a consequence
    get whoGetsWhatGroups() {
        if (!this.willEmail) {
            return [];
        }

        const {visibility} = this.post;
        const onSite = this.willPostToWebsite;

        if (visibility === 'public' || visibility === 'members') {
            return [{
                label: 'Subscribers',
                countFilter: this.audienceCountFilter,
                outcome: 'get the full post by email',
                nothing: false
            }];
        }

        const groups = [{
            label: visibility === 'paid' ? 'Paid members' : this.audienceDescription,
            countFilter: this.audienceCountFilter,
            outcome: 'get the full post by email',
            nothing: false
        }];

        // one row per tier: they are separate audiences to the publisher even
        // though the body they receive is identical
        for (const tier of this.otherPaidTiers) {
            const included = this.isOtherTierIncluded(tier.slug) && this.canIncludeNonAudience;
            groups.push({
                label: `${tier.name} members`,
                countFilter: this.countFilterForTier(tier.slug),
                outcome: included
                    ? this._includedOutcome('inviting a tier upgrade')
                    : this._nothingOutcome(onSite),
                nothing: !included
            });
        }

        const freeIncluded = this.upsellFreeMembers && this.canIncludeNonAudience;
        groups.push({
            label: 'Free members',
            countFilter: this.freeUpsellCountFilter,
            outcome: freeIncluded
                ? this._includedOutcome('with an upgrade button where it ends')
                : this._nothingOutcome(onSite),
            nothing: !freeIncluded
        });

        return groups;
    }

    // a group without access gets either the whole post (a deliberate choice)
    // or the free preview; the confirm step has to name which
    _includedOutcome(previewSuffix) {
        return this.emailBypassPaywall
            ? 'get the full post by email — your paywall is ignored for this send'
            : `get the free preview by email, ${previewSuffix}`;
    }

    _nothingOutcome(onSite) {
        if (!onSite) {
            return 'get no email — and this post isn’t on your site';
        }

        return this.hasPublicPreview
            ? 'get no email — on your site they see the free preview, then an upgrade prompt'
            : 'get no email — on your site they see only the title and an upgrade prompt';
    }

    get whoGetsWhatSummary() {
        const {visibility} = this.post;
        const restricted = visibility === 'paid' || visibility === 'tiers';
        const nonAudienceGets = () => {
            if (!(this.upsellFreeMembers && this.canIncludeNonAudience)) {
                return ' Free subscribers get no email.';
            }
            return this.emailBypassPaywall
                ? ' Free subscribers get the full post too — your paywall is ignored for this send.'
                : ' Free subscribers get the preview by email with an upgrade button.';
        };

        if (!this.willPostToWebsite) {
            let summary = `This ${this.post.displayName} is email-only — it won’t appear on your site.`;
            if (restricted) {
                summary += ` The full ${this.post.displayName} goes to ${this.audienceDescription}.`;
                summary += nonAudienceGets();
            }
            return summary;
        }

        if (visibility === 'public') {
            return 'This post is public. Everyone can read all of it, on your site and by email.';
        }

        let summary = `This post is for ${this.audienceDescription}.`;

        summary += this.hasPublicPreview
            ? ' Everyone else sees the free preview on your site, then an upgrade prompt.'
            : ' Everyone else sees only an upgrade prompt on your site.';

        if (this.willEmail && restricted) {
            summary += nonAudienceGets();
        }

        return summary;
    }

    // the redesign asks two per-step yes/no questions instead of the
    // three-way publish type radio; publishType stays the source of truth
    get willPostToWebsite() {
        return this.publishType !== 'send';
    }

    get canBeEmailOnly() {
        return !this.emailUnavailable && !this.emailDisabled;
    }

    @action
    setWebsiteChannel(postToWebsite) {
        if (postToWebsite) {
            if (this.publishType === 'send') {
                this.publishType = this.canBeEmailOnly ? 'publish+send' : 'publish';
            }
        } else if (this.canBeEmailOnly) {
            this.publishType = 'send';
        }
    }

    @action
    setEmailChannel(sendEmail) {
        if (sendEmail) {
            this.publishType = this.willPostToWebsite ? 'publish+send' : 'send';
        } else {
            // switching email off forces the website channel on — a post has
            // to go somewhere
            this.publishType = 'publish';
        }
    }

    @action
    setUpsellFreeMembers(value) {
        this.upsellFreeMembersOverride = value;
    }

    @action
    setUpsellOtherTiers(value) {
        for (const tier of this.otherPaidTiers) {
            this.setOtherTierIncluded(tier.slug, value);
        }
    }

    @action
    setPaywallIndex(index, blockCount) {
        this.paywallIndex = index;

        if (typeof blockCount === 'number') {
            this.blockCount = blockCount;
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

    constructor({config, feature, limit, post, settings, store, user, membersCountCache} = {}) {
        this.config = config;
        this.feature = feature;
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

        // paid tiers - used by the redesigned email step to derive upsell
        // segments; not gated on paidMembersEnabled because tiers exist (and
        // can gate content) before Stripe is connected
        if (this.feature?.publishFlowRedesign) {
            promises.push(this.store.query('tier', {filter: 'type:paid', limit: 'all'}).then((tiers) => {
                this.allPaidTiers = tiers.toArray();
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
