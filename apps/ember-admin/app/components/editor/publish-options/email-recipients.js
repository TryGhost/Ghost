import Component from '@glimmer/component';
import {hasPublicPreview} from '../../../utils/public-preview-warning';
import {inject as service} from '@ember/service';

export default class EmailRecipientsComponent extends Component {
    @service feature;

    get _previewApplies() {
        const post = this.args.publishOptions.post;

        return this.feature.publicPreviews
            && post.isPost
            && hasPublicPreview(post)
            && (post.emailPublicPreview ?? true);
    }

    // annotates each tickable audience with what it receives, so the control
    // and its consequence are one artifact. Only homogeneous groups get a
    // label: on tiers posts the paid group mixes access levels, so it gets a
    // computed split (paidSplit) instead
    get audienceOutcomes() {
        const post = this.args.publishOptions.post;

        if (!this._previewApplies) {
            return null;
        }

        if (post.visibility === 'paid') {
            return {
                free: 'public preview',
                paid: 'full post'
            };
        }

        if (post.visibility === 'tiers') {
            return {
                free: 'public preview',
                paid: null
            };
        }

        return null;
    }

    // on tiers posts a paid subscriber either holds a tier with access (full
    // post) or not (preview, or an upgrade prompt when the preview audience
    // is free-only) — surfaced as a computed split of the paid group
    get paidSplit() {
        const post = this.args.publishOptions.post;

        if (!this._previewApplies || post.visibility !== 'tiers') {
            return null;
        }

        const tierSlugs = (post.tiers || []).map(tier => tier.slug).filter(Boolean);

        if (!tierSlugs.length) {
            return null;
        }

        const accessSegment = tierSlugs.map(slug => `tier:${slug}`).join(',');
        const noAccessSegment = tierSlugs.map(slug => `tier:-${slug}`).join('+');
        const audience = post.emailPublicPreviewAudience || 'all';

        return {
            fullFilter: `status:-free+(${accessSegment})`,
            otherFilter: `status:-free+(${noAccessSegment})`,
            otherOutcome: audience === 'free' ? 'an upgrade prompt' : 'the public preview'
        };
    }
}
