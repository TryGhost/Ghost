import AudienceSummaryComponent from './audience-summary';

// "What will happen" — the read-only receipt for the single-page publish
// flow. Reuses the audience-summary access/preview filter math; only the
// phrasing and the web/when lines are new.
export default class PublishReceiptComponent extends AudienceSummaryComponent {
    get accessLabel() {
        switch (this.visibility) {
        case 'members':
            return 'members';
        case 'paid':
            return 'paid members';
        case 'tiers': {
            const names = (this.post.tiers || []).map(tier => tier.name).filter(Boolean);
            return names.length ? names.join(' & ') + ' members' : 'selected tiers';
        }
        default:
            return 'everyone';
        }
    }

    get webLine() {
        if (!this.args.publishOptions.willPublish) {
            return 'Not published on the web.';
        }

        if (!this.isGated) {
            return 'Open for everyone to read.';
        }

        if (this.hasPreview) {
            return `The free preview is open to everyone; the rest is for ${this.accessLabel}.`;
        }

        return `Only ${this.accessLabel} can read it — there’s no free preview.`;
    }

    get emailRows() {
        // rows already combine the live recipient filter with access splits,
        // so custom segment sends derive correctly with no extra handling
        return this.rows.map((row) => {
            const phrasing = {
                full: 'get the full post',
                preview: 'get the free preview and the paywall',
                upgrade: 'get just the paywall'
            };

            return {...row, label: phrasing[row.key] || row.label};
        });
    }

    get showEmailBreakdown() {
        return this.args.publishOptions.willEmail && this.isGated && this.post.isPost;
    }
}
