import Component from '@glimmer/component';
import {action} from '@ember/object';
import {getPublicPreviewEmailRisk} from 'ghost-admin/utils/public-preview';
import {tracked} from '@glimmer/tracking';

export default class PublishFlowOptions extends Component {
    @tracked openSection = null;
    @tracked displayedPublicPreviewEmailNotice = null;

    get publicPreviewEmailRisk() {
        const publishOptions = this.args.publishOptions;

        return getPublicPreviewEmailRisk({
            post: publishOptions.post,
            publicPreviewStatus: this.args.publicPreviewStatus,
            recipientFilter: publishOptions.recipientFilter,
            willEmail: publishOptions.willEmail
        });
    }

    get hasPublicPreviewEmailRisk() {
        return !!this.publicPreviewEmailRisk;
    }

    get hasPaidOnlyPaywallOpportunity() {
        const publishOptions = this.args.publishOptions;

        if (!publishOptions.willEmail || this.args.publicPreviewStatus !== 'valid' || publishOptions.post.visibility !== 'paid') {
            return false;
        }

        return this.emailAudienceIsPaidOnly;
    }

    get emailAudienceIsPaidOnly() {
        const publishOptions = this.args.publishOptions;
        const segments = (publishOptions.recipientFilter || '')
            .split(',')
            .map(segment => segment.trim())
            .filter(Boolean);

        return segments.length > 0 && segments.every(segment => segment === 'status:-free' || segment.startsWith('tier:'));
    }

    get publicPreviewEmailNotice() {
        return this.publicPreviewEmailRisk || (this.hasPaidOnlyPaywallOpportunity ? 'paid-only-paywall' : null);
    }

    get isPaidOnlyPaywallOpportunity() {
        return this.currentOrDisplayedPublicPreviewEmailNotice === 'paid-only-paywall';
    }

    get freeMembersRecipientFilter() {
        const newsletterFilter = this.args.publishOptions.newsletter?.recipientFilter;

        return newsletterFilter ? `${newsletterFilter}+status:free` : 'status:free';
    }

    get publicPreviewEmailRiskMessage() {
        const freeMembersAreAffected = this.currentOrDisplayedPublicPreviewEmailNotice === 'free-members';

        if (this.args.publicPreviewStatus === 'top') {
            if (freeMembersAreAffected) {
                return 'Free members will see a paywall before any preview content in the email.';
            }

            return 'Some recipients without access will see a paywall before any preview content in the email.';
        }

        if (this.args.publicPreviewStatus === 'multiple') {
            if (freeMembersAreAffected) {
                return 'Free members will only see the content before the first public preview in the email.';
            }

            return 'Some recipients without access will only see the content before the first public preview in the email.';
        }

        if (freeMembersAreAffected) {
            return 'Free members will get the full paid post by email.';
        }

        return 'Some recipients will receive the full post by email, even though they don’t have access on your site.';
    }

    get publicPreviewEmailOpportunityMessage() {
        if (this.args.publicPreviewStatus === 'top') {
            return 'Move the public preview below some free content.';
        }

        if (this.args.publicPreviewStatus === 'bottom') {
            return 'Move the public preview above the content that should require access.';
        }

        if (this.args.publicPreviewStatus === 'multiple') {
            return 'Keep one public preview where the free content should end.';
        }

        if (this.currentOrDisplayedPublicPreviewEmailNotice === 'free-members') {
            return 'There’s no public preview to end their copy early.';
        }

        return 'Add a public preview to encourage them to get access.';
    }

    get hasInvalidPaywall() {
        return ['top', 'bottom', 'multiple'].includes(this.args.publicPreviewStatus);
    }

    get continueButtonText() {
        if (!this.hasPublicPreviewEmailRisk) {
            return 'Continue, final review →';
        }

        if (['top', 'multiple'].includes(this.args.publicPreviewStatus)) {
            return 'Continue anyway →';
        }

        return 'Continue with full email →';
    }

    get currentOrDisplayedPublicPreviewEmailNotice() {
        return this.publicPreviewEmailNotice || this.displayedPublicPreviewEmailNotice;
    }

    @action
    rememberPublicPreviewEmailNotice(_element, [publicPreviewEmailNotice]) {
        if (publicPreviewEmailNotice) {
            this.displayedPublicPreviewEmailNotice = publicPreviewEmailNotice;
        }
    }

    @action
    finishPublicPreviewEmailNoticeTransition(event) {
        if (event.propertyName === 'opacity' && !this.publicPreviewEmailNotice) {
            this.displayedPublicPreviewEmailNotice = null;
        }
    }

    @action
    includeFreeMembers() {
        const publishOptions = this.args.publishOptions;
        const segments = (publishOptions.recipientFilter || '')
            .split(',')
            .map(segment => segment.trim())
            .filter(Boolean);

        if (!segments.includes('status:free')) {
            publishOptions.setRecipientFilter(['status:free', ...segments].join(','));
        }
    }

    @action
    toggleSection(section) {
        if (this.openSection === 'emailRecipients' && !this.publicPreviewEmailNotice) {
            this.displayedPublicPreviewEmailNotice = null;
        }

        if (section === this.openSection) {
            this.openSection = null;
        } else {
            this.openSection = section;
        }
    }
}
