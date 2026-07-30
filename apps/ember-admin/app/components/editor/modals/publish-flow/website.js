import Component from '@glimmer/component';
import {action} from '@ember/object';
import {tracked} from '@glimmer/tracking';

const VISIBILITY_OPTIONS = [
    {value: 'public', label: 'Everyone'},
    {value: 'members', label: 'Members'},
    {value: 'paid', label: 'Paid members'},
    {value: 'tiers', label: 'Specific tiers'}
];

export default class PublishFlowWebsite extends Component {
    // {paywallIndex, blockCount} mirrored from the editor
    @tracked placementState = {paywallIndex: null, blockCount: 0};

    // placing is a mode, not a state of the post: while it's on the panel
    // docks beside the editor and asks one question. Coming back to the step
    // with a preview already placed shows the settled card instead.
    @tracked placementActive = false;

    // the copy form is a sub-view of the panel, opened from its entry
    @tracked showGateFields = false;

    // the visitor render is evidence, shown in a lightbox on demand — the
    // canvas beside a docked panel belongs to the editor
    @tracked visitorPreviewOpen = false;

    constructor() {
        super(...arguments);
        this.refreshPlacementState();

        // arriving here as a detour from the email step: go straight into the
        // room, creating the line if there isn't one yet
        if (this.args.autoPlacement && this.args.editorAPI) {
            if (!this.previewEnabled) {
                this.args.editorAPI.setPaywallPosition?.(1);
                this.refreshPlacementState();
            }
            this.enterPlacement();
        }
    }

    willDestroy() {
        super.willDestroy(...arguments);
        this.args.editorAPI?.exitPaywallPlacement?.();
    }

    get post() {
        return this.args.publishOptions.post;
    }

    get willPostToWebsite() {
        return this.args.publishOptions.willPostToWebsite;
    }

    get canBeEmailOnly() {
        return this.args.publishOptions.canBeEmailOnly;
    }

    get visibilityOptions() {
        return VISIBILITY_OPTIONS.map(option => ({
            ...option,
            selected: option.value === this.post.visibility
        }));
    }

    get isRestricted() {
        return this.post.visibility !== 'public';
    }

    get showTierSelection() {
        return this.post.visibility === 'tiers';
    }

    get availableTiers() {
        const passedTiers = this.args.tiers || [];
        return passedTiers.length ? passedTiers : (this.args.publishOptions.allPaidTiers || []);
    }

    get tierOptions() {
        const selectedSlugs = (this.post.tiers || []).map(t => t.slug);

        return this.availableTiers.map(tier => ({
            tier,
            selected: selectedSlugs.includes(tier.slug)
        }));
    }

    // "add a public preview?" is an explicit yes/no; yes means the cut sits
    // after at least one block, no means no paywall marker at all
    get previewEnabled() {
        const {paywallIndex} = this.placementState;
        return typeof paywallIndex === 'number' && paywallIndex > 0;
    }

    // a preview exists on the post; the step shows what was decided
    get showPlacementUI() {
        return this.isRestricted && this.previewEnabled && !!this.args.editorAPI;
    }


    get lightboxTarget() {
        return document.body;
    }

    get visitorPreviewUrl() {
        // the frontend preview controller applies real gating for the
        // requested member status, so this is the truth, theme included
        return `${this.post.previewUrl}?member_status=anonymous`;
    }

    get placementSummary() {
        const {paywallIndex, blockCount} = this.placementState;

        if (typeof paywallIndex !== 'number' || paywallIndex < 1) {
            return null;
        }

        return {publicCount: paywallIndex, totalCount: blockCount};
    }

    get audienceDescription() {
        return this.args.publishOptions.audienceDescription;
    }

    refreshPlacementState() {
        const result = this.args.editorAPI?.getContentBlocks?.();

        if (!result) {
            this.placementState = {paywallIndex: null, blockCount: 0};
            this.args.publishOptions.setPaywallIndex(null);
            return;
        }

        this.placementState = {paywallIndex: result.paywallIndex, blockCount: result.blocks.length};
        this.args.publishOptions.setPaywallIndex(result.paywallIndex, result.blocks.length);
    }

    // every gate field shows its access-derived default until the writer
    // edits it; an edited field is theirs, an untouched one keeps following
    // the access setting (editing back to the default re-links it)
    get gateDefaults() {
        const siteTitle = this.args.publishOptions.settings?.title || 'this site';
        const isMembers = this.post.visibility === 'members';

        return {
            heading: `This ${this.post.displayName} is for ${this.args.publishOptions.audienceDescription}`,
            pitch: isMembers
                ? `Become a member of ${siteTitle} to get access to all content.`
                : `Become a paid member of ${siteTitle} to get access to all premium content.`,
            buttonText: isMembers ? 'Sign up — it’s free' : 'Upgrade',
            buttonUrl: '#/portal/signup'
        };
    }

    get gateEffective() {
        const defaults = this.gateDefaults;

        return {
            heading: this.post.paywallHeading || defaults.heading,
            pitch: this.post.paywallPitch || defaults.pitch,
            buttonText: this.post.paywallButtonText || defaults.buttonText,
            buttonUrl: this.post.paywallButtonUrl || defaults.buttonUrl
        };
    }

    enterPlacement() {
        this.args.editorAPI?.enterPaywallPlacement?.({
            onChange: (state) => {
                this.placementState = state;
                this.args.publishOptions.setPaywallIndex(state.paywallIndex, state.blockCount);
            },
            gate: this.gateEffective
        });
        this.placementActive = true;
        this.args.setDocked?.(true);
    }

    @action
    changePlacement() {
        this.enterPlacement();
    }

    // leaving the room keeps the preview — only the mode ends
    @action
    donePlacing() {
        this.args.editorAPI?.exitPaywallPlacement?.();
        this.placementActive = false;
        this.args.setDocked?.(false);
        this._saveDraft();
        this.args.onPlacementDone?.();
    }


    @action
    openVisitorPreview() {
        this.visitorPreviewOpen = true;
    }

    @action
    closeVisitorPreview() {
        this.visitorPreviewOpen = false;
    }


    // panel inputs edit the gate; the canvas preview reflects each keystroke.
    // A field equal to its default stores null and keeps following access.
    @action
    updateGateField(field, event) {
        const attrNames = {
            heading: 'paywallHeading',
            pitch: 'paywallPitch',
            buttonText: 'paywallButtonText',
            buttonUrl: 'paywallButtonUrl'
        };
        const value = event.target.value;
        const defaultValue = this.gateDefaults[field];

        this.post.set(attrNames[field], value && value !== defaultValue ? value : null);
        this.args.editorAPI?.updatePlacementGate?.(this.gateEffective);
    }

    @action
    saveGateFields() {
        this._saveDraft();
    }

    exitPlacement() {
        this.args.editorAPI?.exitPaywallPlacement?.();
        this.placementActive = false;
        this.args.setDocked?.(false);
    }

    // Moving the paywall mutates the editor directly, which doesn't run the
    // host's onChange — so lexicalScratch, the thing savePostTask writes to
    // post.lexical, would still hold the body from before the move.
    _syncEditorContent() {
        const lexical = this.args.editorAPI?.serialize?.();

        if (lexical) {
            this.post.set('lexicalScratch', lexical);
        }
    }

    _saveDraft() {
        this._syncEditorContent();

        if (this.post.isDraft) {
            this.args.savePostTask?.perform();
        }
    }

    @action
    setPostToWebsite(postToWebsite) {
        const wasPlacing = this.placementActive;

        this.args.publishOptions.setWebsiteChannel(postToWebsite);

        // an email-only post asks nothing else here — its audience is decided
        // on the email step, where the consequences are visible
        if (!postToWebsite && wasPlacing) {
            this.exitPlacement();
        }
    }

    @action
    setVisibility(visibility) {
        if (visibility === this.post.visibility) {
            return;
        }

        const wasPlacing = this.placementActive;

        this.post.set('visibility', visibility);

        if (visibility === 'tiers') {
            // default to all paid tiers so switching never creates a
            // nobody-has-access state
            if (!this.post.tiers?.length) {
                const tiers = this.availableTiers.map(t => ({id: t.id, name: t.name, slug: t.slug}));
                this.post.set('tiers', tiers);
            }
        } else {
            this.post.set('tiers', []);
        }

        // changing who can read the post invalidates the previous
        // where-the-preview-ends decision — the preview question resets to
        // "No, just the title" and gets asked fresh for the new audience
        this.args.editorAPI?.removePaywall?.();
        this.refreshPlacementState();
        this.args.publishOptions.resetRowChoices();

        if (wasPlacing) {
            this.exitPlacement();
        }

        this._saveDraft();
    }

    @action
    toggleTier(tier) {
        const currentTiers = this.post.tiers || [];
        const isSelected = currentTiers.some(t => t.slug === tier.slug);

        if (isSelected) {
            // always keep at least one tier selected
            if (currentTiers.length <= 1) {
                return;
            }
            this.post.set('tiers', currentTiers.filter(t => t.slug !== tier.slug));
        } else {
            this.post.set('tiers', [...currentTiers, {id: tier.id, name: tier.name, slug: tier.slug}]);
        }

        // tier changes rewrite the gate's derived fields in place; custom
        // fields survive because effective values prefer them
        this.args.editorAPI?.updatePlacementGate?.(this.gateEffective);

        this._saveDraft();
    }



    @action
    toggleGateFields() {
        this.showGateFields = !this.showGateFields;
    }

    @action
    removePreview() {
        this.args.editorAPI?.removePaywall?.();
        this.refreshPlacementState();
        this.exitPlacement();
        this._saveDraft();
        this.args.onPlacementDone?.();
    }

    @action
    setPreviewEnabled(enabled) {
        if (enabled === this.previewEnabled) {
            return;
        }

        if (enabled) {
            // default the cut after the first block; the editor beneath shows
            // the line and the gap targets for adjusting it
            this.args.editorAPI?.setPaywallPosition?.(1);
            this.refreshPlacementState();
            this.enterPlacement();
        } else {
            this.args.editorAPI?.removePaywall?.();
            this.refreshPlacementState();
            this.exitPlacement();
        }
    }

    @action
    handleNext() {
        // placement affordances belong to this step only
        this.exitPlacement();
        this.args.next();
    }
}
