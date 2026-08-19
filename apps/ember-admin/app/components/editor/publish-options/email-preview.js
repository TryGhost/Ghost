import Component from '@glimmer/component';
import paywallCardPreview from 'ghost-admin/utils/paywall-card-preview';
import {inject as service} from '@ember/service';

/**
 * The preview step: who among the people the full send leaves out should get a
 * teaser ending at the paywall.
 *
 * It's a different email from the post, so it's a different question, one step
 * later. Its options are everything the previous step didn't take, which keeps
 * a member from being sent both versions with nothing to validate afterwards.
 *
 * There's no yes/no in front of it - selecting someone is the yes and clearing
 * the selection is the no, so the step asks once rather than twice. The closing
 * line is what makes an empty selection read as an answer.
 *
 * Both the audience it defaults to and the segments it may offer live on
 * `publishOptions`, so there's one definition rather than two that can drift.
 */
export default class EmailPreview extends Component {
    @service settings;

    get publishOptions() {
        return this.args.publishOptions;
    }

    get hiddenSegments() {
        return this.publishOptions?.previewHiddenSegments || [];
    }

    // The author's own paywall card, shown behind the word "paywall" on hover
    get paywallPreview() {
        return paywallCardPreview(this.publishOptions?.post, 'email', this.settings.accentColor);
    }

    // named on publishOptions so the review can repeat it in the same words
    get previewSummary() {
        return this.publishOptions?.previewAudienceLabel;
    }
}
