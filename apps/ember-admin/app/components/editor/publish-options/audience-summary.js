import Component from '@glimmer/component';
import {hasPublicPreviewContent} from '../../../utils/public-preview-warning';
import {inject as service} from '@ember/service';

// Read-only "who gets what" breakdown for gated posts (publicPreviews labs flag).
// The email recipient list stays authoritative for who receives an email; the
// divider determines what the without-access portion of those recipients see:
// with one the email is truncated to the public preview, without one the full
// post goes to everyone on the list.
export default class AudienceSummaryComponent extends Component {
    @service feature;

    get post() {
        return this.args.publishOptions.post;
    }

    get visibility() {
        return this.post.visibility || 'public';
    }

    get isGated() {
        return this.visibility !== 'public';
    }

    get hasPreview() {
        return hasPublicPreviewContent(this.post);
    }

    get showSummary() {
        return this.feature.publicPreviews
            && this.post.isPost
            && this.isGated
            && this.args.publishOptions.willEmail;
    }

    get baseFilter() {
        return this.args.publishOptions.fullRecipientFilter;
    }

    get tierSlugs() {
        return (this.post.tiers || []).map(tier => tier.slug).filter(Boolean);
    }

    // recipients with access to the full post; null → everyone in the send
    get accessFilter() {
        if (this.visibility === 'paid') {
            return 'status:-free';
        }

        if (this.visibility === 'tiers') {
            return this.tierSlugs.length ? this.tierSlugs.map(slug => `tier:${slug}`).join(',') : null;
        }

        // members-only: every email recipient is a member, so all have access
        return null;
    }

    get noAccessFilter() {
        if (this.visibility === 'paid') {
            return 'status:free';
        }

        if (this.visibility === 'tiers') {
            return this.tierSlugs.length ? this.tierSlugs.map(slug => `tier:-${slug}`).join('+') : null;
        }

        return null;
    }

    get rows() {
        const rows = [];
        const combine = filter => (filter ? `${this.baseFilter}+(${filter})` : this.baseFilter);

        // the divider bypass sends everyone on the list the whole thing
        if (this.post.emailFullPost && !this.hasPreview) {
            rows.push({
                key: 'full',
                label: 'get the full post',
                filter: combine(null)
            });

            return rows;
        }

        rows.push({
            key: 'full',
            label: 'get the full post',
            filter: combine(this.accessFilter)
        });

        if (this.noAccessFilter) {
            rows.push({
                key: 'preview',
                label: this.hasPreview ? 'get the public preview' : 'get the title & image only',
                filter: combine(this.noAccessFilter)
            });
        }

        return rows;
    }

    // phrased to complete "Publish and email …" so the flow reads top-down as
    // one sentence: "137 subscribers the full post and 675 the public
    // preview". Deliberately no access labels — the counts carry the meaning
    // and tiers posts would otherwise need "without access" phrasing
    get inlineRows() {
        const thingNouns = {
            full: 'the full post',
            preview: 'the public preview'
        };

        const rows = this.rows.map(row => ({
            ...row,
            thing: thingNouns[row.key]
        }));

        rows.sort((a, b) => {
            const order = {full: 0, preview: 1};
            return order[a.key] - order[b.key];
        });

        return rows.map((row, index) => ({
            ...row,
            // "email 137 [Practical effector] subscribers the full post and
            // 675 the public preview" — the newsletter name reads as a
            // compound ("Practical effector subscribers"), not an "of" clause
            first: index === 0,
            showNewsletter: index === 0 && !this.args.publishOptions.onlyDefaultNewsletter,
            separator: index === 0 ? '' : (index === rows.length - 1 ? ' and ' : ', ')
        }));
    }

    get webNote() {
        if (this.hasPreview) {
            return 'On the web, everyone can read the public preview; the full post stays gated.';
        }

        return 'On the web, only people with access can read this post; everyone else sees a signup prompt.';
    }
}
