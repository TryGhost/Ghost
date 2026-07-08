import Component from '@glimmer/component';
import {action} from '@ember/object';

export default class PaywallNotice extends Component {
    get post() {
        return this.args.publishOptions.post;
    }

    get hasPaywall() {
        const lexical = this.post.lexicalScratch || this.post.lexical || '';
        return lexical.includes('"type":"paywall"');
    }

    get isGatedVisibility() {
        return this.post.visibility === 'paid' || this.post.visibility === 'tiers';
    }

    get freeMembersIncluded() {
        const filter = this.args.publishOptions.recipientFilter || '';
        return filter.split(',').map(segment => segment.trim()).includes('status:free');
    }

    get willEmail() {
        return this.args.publishOptions.willEmail;
    }

    // count free members the same way the send does — scoped to the selected
    // newsletter — so the number here always matches the recipients row
    get freeCountFilter() {
        const newsletterFilter = this.args.publishOptions.newsletter?.recipientFilter;
        return newsletterFilter ? `${newsletterFilter}+(status:free)` : 'status:free';
    }

    // Paid post, free members in the send list, but no paywall divider in the
    // content — free members would receive the full paid post by email
    get showFullContentWarning() {
        return this.willEmail && this.isGatedVisibility && this.freeMembersIncluded && !this.hasPaywall;
    }

    // Paywall divider present but free members aren't receiving the email —
    // they could be getting a free preview that ends at the paywall
    get showPreviewOpportunity() {
        return this.willEmail && this.isGatedVisibility && !this.freeMembersIncluded && this.hasPaywall;
    }

    // Everything lines up — spell out what free members will actually receive
    get showPreviewConfirmation() {
        return this.willEmail && this.isGatedVisibility && this.freeMembersIncluded && this.hasPaywall;
    }

    // Sign-up walls never truncate email (every recipient is a member), but
    // say so here instead of leaving the flow silent about the gate
    get showSignupWallInfo() {
        return this.willEmail && this.post.visibility === 'members' && this.hasPaywall;
    }

    @action
    includeFreeMembers() {
        const filter = this.args.publishOptions.recipientFilter;
        const segments = filter ? filter.split(',').map(segment => segment.trim()) : [];

        if (!segments.includes('status:free')) {
            this.args.publishOptions.setRecipientFilter(['status:free', ...segments].join(','));
        }
    }
}
