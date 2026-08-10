import Component from '@glimmer/component';
import copyTextToClipboard from 'ghost-admin/utils/copy-text-to-clipboard';
import {action} from '@ember/object';
import {groupTiersByActive} from 'ghost-admin/utils/group-tiers';
import {inject as service} from '@ember/service';
import {task} from 'ember-concurrency';
import {tracked} from '@glimmer/tracking';

export default class EditorPostPreviewModal extends Component {
    @service dropdown;
    @service settings;
    @service session;

    static modalOptions = {
        className: 'fullscreen-modal-total-overlay publish-modal',
        omitBackdrop: true,
        ignoreBackdropClick: true
    };

    @tracked previewFormat = this.args.data.initialPreviewFormat || 'browser';
    @tracked previewSize = this.args.data.initialPreviewSize || 'desktop';
    @tracked isChangingTab = false;
    @tracked previewEmailAddress = this.session.user.email;
    @tracked previewAsSegment = 'free';
    @tracked previewAsOptions = [];
    @tracked previewTierSlug;

    tiers = this.args.data.tiers || [];

    constructor() {
        super(...arguments);
        this.saveFirstTask.perform();

        const {initialPreviewAsSegment, initialPreviewTierSlug} = this.args.data;

        const defaultTier = this.tiers.find(tier => tier.slug === initialPreviewTierSlug)
            || this.tiers.find(tier => tier.active)
            || this.tiers[0];
        this.previewTierSlug = defaultTier?.slug;

        if (initialPreviewAsSegment) {
            const segment = initialPreviewAsSegment === 'tier' && !this.previewTierSlug
                ? (this.settings.paidMembersEnabled ? 'paid' : 'free')
                : initialPreviewAsSegment;
            this.changePreviewAsSegment(segment);
        }

        this.setPreviewAsOptions();
    }

    get selectedPreviewAsOption() {
        return this.previewAsOptions.find(option => option.value === this.previewAsSegment);
    }

    get selectedPreviewTier() {
        return this.tiers.find(tier => tier.slug === this.previewTierSlug);
    }

    get previewTierOptions() {
        return groupTiersByActive(this.tiers).filter(group => group.options.length > 0);
    }

    get showTierDropdown() {
        return this.previewAsSegment === 'tier' && this.tiers.length > 0;
    }

    get showMemberSegmentDropdown() {
        // Always show dropdown on browser/web tab (has multiple options)
        if (this.previewFormat === 'browser') {
            return true;
        }
        // On email tab, only show if there's more than one option
        return this.previewAsOptions.length > 1;
    }

    get skipAnimation() {
        return this.args.data.skipAnimation || this.isChangingTab;
    }

    get browserPreviewUrl() {
        const url = new URL(this.args.data.publishOptions.post.previewUrl);
        url.searchParams.set('member_status', this.previewAsSegment === 'tier' ? 'paid' : this.previewAsSegment);

        if (this.previewAsSegment === 'tier' && this.previewTierSlug) {
            url.searchParams.set('member_tier', this.previewTierSlug);
        } else {
            url.searchParams.delete('member_tier');
        }

        return url.toString();
    }

    get emailMemberStatus() {
        if (this.previewAsSegment === 'paid' || this.previewAsSegment === 'tier') {
            return 'paid';
        }

        return 'free';
    }

    get emailMemberTier() {
        return this.previewAsSegment === 'tier' ? this.previewTierSlug : null;
    }

    get emailMemberDescription() {
        if (this.previewAsSegment === 'tier' && this.selectedPreviewTier) {
            return `${this.selectedPreviewTier.name} tier member`;
        }

        return `${this.previewAsSegment} member`;
    }

    // manually set the tracked property rather than using a getter so we have
    // a stable reference when finding the selected option by value
    setPreviewAsOptions() {
        if (this.previewFormat === 'email') {
            this.previewAsOptions = [
                {label: 'Free member', value: 'free'}
            ];
        } else {
            this.previewAsOptions = [
                {label: 'Public visitor', value: 'anonymous'},
                {label: 'Free member', value: 'free'}
            ];
        }

        // add paid options if Stripe is enabled
        if (this.settings.paidMembersEnabled) {
            this.previewAsOptions.push(
                {label: 'Paid member', value: 'paid'}
            );

            if (this.tiers.length > 0) {
                this.previewAsOptions.push(
                    {label: 'Specific tier', value: 'tier'}
                );
            }
        }
    }

    @action
    changePreviewFormat(format) {
        this.isChangingTab = true;
        this.previewFormat = format;
        this.args.data.changePreviewFormat?.(format);
        this.setPreviewAsOptions();

        if (format === 'email' && this.previewAsSegment === 'anonymous') {
            this.changePreviewAsSegment('free');
        }
    }

    @action
    changePreviewSize(size) {
        this.isChangingTab = true;
        this.previewSize = size;
        this.args.data.changePreviewSize?.(size);
    }

    @action
    changePreviewAsSegment(segment) {
        if (this.previewFormat === 'email' && segment === 'anonymous') {
            segment = 'free';
        }
        this.previewAsSegment = segment;
        this.args.data.changePreviewAsSegment?.(segment);
    }

    @action
    changePreviewAsOption(option) {
        this.changePreviewAsSegment(option.value);
    }

    @action
    changePreviewTier(tier) {
        this.previewTierSlug = tier.slug;
        this.args.data.changePreviewTier?.(tier.slug);
    }

    @action
    focusInput() {
        setTimeout(() => {
            document.querySelector('[data-post-preview-email-input]')?.focus();
        }, 100);
    }

    @task
    *saveFirstTask() {
        const {saveTask, publishOptions, hasDirtyAttributes} = this.args.data;

        if (saveTask.isRunning) {
            return yield saveTask.last;
        }

        if (publishOptions.post.isDraft && hasDirtyAttributes) {
            yield saveTask.perform();
        }
    }

    @task
    *copyPreviewUrlTask() {
        copyTextToClipboard(this.browserPreviewUrl);
        return yield true;
    }
}
