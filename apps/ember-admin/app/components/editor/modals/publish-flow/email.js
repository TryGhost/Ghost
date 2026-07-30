import Component from '@glimmer/component';
import {action} from '@ember/object';
import {inject as service} from '@ember/service';
import {task} from 'ember-concurrency';
import {tracked} from '@glimmer/tracking';

export default class PublishFlowEmail extends Component {
    @service ajax;
    @service feature;
    @service ghostPaths;
    @service store;

    @tracked labels = [];
    @tracked groupMenuOpen = false;

    // which group's rendered email the lightbox shows; opened on demand from
    // a row's inbox line, never ambient
    @tracked viewAs = null;
    @tracked previewHtml = '';
    @tracked previewSubject = '';
    @tracked lightboxOpen = false;

    constructor() {
        super(...arguments);
        this.loadLabelsTask.perform();
    }

    @task
    *loadLabelsTask() {
        try {
            const labels = yield this.store.query('label', {limit: 'all'});
            this.labels = labels.toArray ? labels.toArray() : [...labels];
        } catch (e) {
            this.labels = [];
        }
    }

    // sets the writer can add to the audience list, grouped for the menu;
    // already-added sets are filtered out
    get availableGroupSections() {
        const selected = new Set((this.publishOptions.selectedGroups || []).map(g => g.filter));
        const sections = [];

        const membership = [
            {label: 'Free members', filter: 'status:free'},
            {label: 'All paid members', filter: 'status:-free'}
        ].filter(g => !selected.has(g.filter));
        if (membership.length) {
            sections.push({name: 'Membership', groups: membership});
        }

        const tiers = (this.publishOptions.allPaidTiers || [])
            .map(t => ({label: `${t.name} tier`, filter: `tier:${t.slug}`}))
            .filter(g => !selected.has(g.filter));
        if (tiers.length) {
            sections.push({name: 'Tiers', groups: tiers});
        }

        const labels = (this.labels || [])
            .map(l => ({label: `Label: ${l.name}`, filter: `label:${l.slug}`}))
            .filter(g => !selected.has(g.filter));
        if (labels.length) {
            sections.push({name: 'Labels', groups: labels});
        }

        return sections;
    }

    get showNoPreviewHint() {
        return this.showUpsells && !this.publishOptions.canIncludeNonAudience;
    }

    // a web post's teaser has no line yet — the fix is on step 1, so say so
    // there rather than duplicating the control here
    get showMissingLineNote() {
        return !this.isEmailOnly
            && !this.bypassPaywall
            && !this.publishOptions.hasPublicPreview
            && this.sendsAPreview;
    }

    get bypassPaywall() {
        return this.publishOptions.emailBypassPaywall;
    }

    // the preview line can be placed from here — the row that owns the
    // consequence — rather than by sending the writer back a step
    get canPlacePreview() {
        return !!this.args.editorAPI && !!this.args.startPlacement;
    }

    // a web post adjusts the line on the website step, where the site
    // consequences are stated; an email-only post has only this row
    get showAdjustPreview() {
        return this.isEmailOnly && this.canPlacePreview && this.publishOptions.hasPublicPreview;
    }

    // Each group without access gets one of three things. Sending the whole
    // post is one option among three, not a switch of its own — it's a
    // per-group outcome, so it sits where the group's outcome is stated.
    // In groups mode the token list decides who is included, so the row is
    // only about which version they get — "nothing" would be a second way to
    // exclude, and the honest one is removing the group.
    get inGroupsMode() {
        return this.publishOptions.audienceMode === 'groups';
    }

    get freeRowMode() {
        if (!this.publishOptions.upsellFreeMembers) {
            return 'nothing';
        }
        return this.bypassPaywall ? 'full' : 'preview';
    }

    // one row per excluded tier, each with its own inclusion
    get otherTierRows() {
        return this.publishOptions.otherPaidTiers.map((tier) => {
            const included = this.publishOptions.isOtherTierIncluded(tier.slug);
            return {
                tier,
                countFilter: this.publishOptions.countFilterForTier(tier.slug),
                mode: included ? (this.bypassPaywall ? 'full' : 'preview') : 'nothing'
            };
        });
    }

    @action
    setTierRowMode(tier, mode) {
        this.publishOptions.setOtherTierIncluded(tier.slug, mode !== 'nothing');
        this._applyBypassForMode(mode);
    }

    @action
    setFreeRowMode(mode) {
        this.publishOptions.setUpsellFreeMembers(mode !== 'nothing');
        this._applyBypassForMode(mode);
    }

    // one email carries one body, so "the whole thing" is a property of the
    // send: choosing it for one group applies to every included group
    _applyBypassForMode(mode) {
        if (mode === 'full') {
            this.publishOptions.setEmailBypassPaywall(true);
        } else if (mode === 'preview') {
            this.publishOptions.setEmailBypassPaywall(false);
        }

        this._saveDraft();
    }

    // Where the free preview ends is a property of the post, decided on step 1 where
    // the site consequences are stated. An email-only post has no step 1
    // question to decide it, so it owns the control here — and only there.
    get showPreviewDetail() {
        return this.isEmailOnly && !this.bypassPaywall && this.sendsAPreview;
    }

    // in groups mode the selection decides who is included, so any
    // non-audience group in it receives the free preview
    get sendsAPreview() {
        return this.publishOptions.upsellFreeMembers || this.publishOptions.upsellOtherTiers;
    }

    get sharedFullPostNote() {
        return this.bypassPaywall && this.showOtherTiersUpsell;
    }

    // An email-only post has no website step to set its paywall from, so it
    // owns that here. These follow the paywall itself — the line in the post —
    // not the access setting: a gated post with no line has nothing to remove.
    get hasPaywall() {
        return this.publishOptions.hasPublicPreview;
    }

    get canAddPaywall() {
        // the row that needs it offers it in place; don't ask twice
        return this.isEmailOnly && !this.hasPaywall && !this.showPreviewDetail;
    }

    get canRemovePaywall() {
        return this.isEmailOnly && this.hasPaywall;
    }

    @action
    addPaywall() {
        // an ungated post has no groups to split, so make the split first
        if (!this.showUpsells) {
            this.post.set('visibility', 'paid');
            this.post.set('tiers', []);
            this.publishOptions.resetRowChoices();
        }

        this._saveDraft();

        // the line has to fall somewhere — go choose it now
        this.args.startPlacement?.();
    }

    @action
    removePaywall() {
        this.post.set('visibility', 'public');
        this.post.set('tiers', []);
        this.args.editorAPI?.removePaywall?.();
        this.publishOptions.setPaywallIndex(null);
        this.publishOptions.resetRowChoices();
        this._saveDraft();
    }

    _saveDraft() {
        if (this.post.isDraft) {
            this.args.savePostTask?.perform();
        }
    }

    @action
    setAudienceMode(mode) {
        this.publishOptions.setAudienceMode(mode);
        this.groupMenuOpen = false;
    }

    @action
    toggleGroupMenu() {
        this.groupMenuOpen = !this.groupMenuOpen;
    }

    @action
    addGroup(group) {
        this.publishOptions.addGroup(group);
        this.groupMenuOpen = false;
    }

    @action
    removeGroup(filter) {
        this.publishOptions.removeGroup(filter);
    }

    get publishOptions() {
        return this.args.publishOptions;
    }

    get post() {
        return this.publishOptions.post;
    }

    get willSendEmail() {
        return !this.publishOptions.emailUnavailable
            && !this.publishOptions.emailDisabled
            && this.publishOptions.publishType !== 'publish';
    }

    // email-only posts have no send/don't-send choice — email is the only channel
    get isEmailOnly() {
        return !this.publishOptions.willPostToWebsite;
    }

    // the free/other-tier upsells only exist for paid/tiers visibility;
    // members posts are never truncated in email so everyone gets the full post
    get showUpsells() {
        const {visibility} = this.post;
        return visibility === 'paid' || visibility === 'tiers';
    }

    get showOtherTiersUpsell() {
        return this.post.visibility === 'tiers'
            && this.publishOptions.otherPaidTiers.length > 0;
    }

    // row labels are names in a list, not mid-sentence fragments
    get fullPostRowLabel() {
        const label = this.publishOptions.emailAudienceLabel || '';
        return label.charAt(0).toUpperCase() + label.slice(1);
    }

    get lightboxAudienceLabel() {
        return this.viewAs === 'free' ? 'a free subscriber' : 'a paid member';
    }

    // the lightbox portals to the body so the modal's animation transform
    // can't trap its fixed positioning
    get lightboxTarget() {
        return document.body;
    }

    @action
    setSendEmail(sendEmail) {
        this.publishOptions.setEmailChannel(sendEmail);
    }

    @action
    toggleUpsellFree(event) {
        this.publishOptions.setUpsellFreeMembers(event.target.checked);
    }

    @action
    toggleUpsellOtherTiers(event) {
        this.publishOptions.setUpsellOtherTiers(event.target.checked);
    }

    // both email versions exist only when the post is restricted and has a
    // preview; otherwise there is a single version and no tabs
    get showLightboxTabs() {
        return this.showUpsells && this.publishOptions.hasPublicPreview && !this.bypassPaywall;
    }

    @action
    setViewAs(viewAs) {
        this.viewAs = viewAs;
        this.previewHtml = '';
        this.fetchPreviewTask.perform();
    }

    @action
    openLightbox(viewAs) {
        this.viewAs = viewAs;
        this.lightboxOpen = true;
        this.previewHtml = '';
        this.fetchPreviewTask.perform();
    }

    @action
    closeLightbox() {
        this.lightboxOpen = false;
    }

    @task({restartable: true})
    *fetchPreviewTask() {
        if (!this.publishOptions.newsletter) {
            return;
        }

        // same endpoint the preview modal's email tab uses; previewByTier
        // sites take member_status, older backends the memberSegment param
        const params = this.feature.previewByTier
            ? {member_status: this.viewAs}
            : {memberSegment: this.viewAs === 'paid' ? 'status:-free' : 'status:free'};

        const url = new URL(this.ghostPaths.url.api('/email_previews/posts', this.post.id), window.location.href);
        for (const [param, value] of Object.entries(params)) {
            url.searchParams.set(param, value);
        }
        url.searchParams.set('newsletter', this.publishOptions.newsletter.slug);

        try {
            const response = yield this.ajax.request(url.href);
            const [emailPreview] = response.email_previews;
            this.previewHtml = emailPreview.html;
            this.previewSubject = emailPreview.subject;
        } catch (e) {
            // the canvas is evidence, not a gate — a failed preview never
            // blocks the flow
            this.previewHtml = '';
            this.previewSubject = '';
        }
    }

    @action
    handleNewsletterChange(newsletter) {
        this.publishOptions.setNewsletter(newsletter);
        this.fetchPreviewTask.perform();
    }
}
