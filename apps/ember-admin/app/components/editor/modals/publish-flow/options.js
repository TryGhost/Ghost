import Component from '@glimmer/component';
import PaidPostPreviewWarningModal from '../paid-post-preview-warning';
import {action} from '@ember/object';
import {inject as service} from '@ember/service';
import {tracked} from '@glimmer/tracking';

export default class PublishFlowOptions extends Component {
    @service modals;

    // when we reopen the flow after adding a public preview we land on the
    // audience section — the author still has to confirm who receives it
    @tracked openSection = this.args.initialSection ?? null;

    @action
    toggleSection(section) {
        if (section === this.openSection) {
            this.openSection = null;
        } else {
            this.openSection = section;
        }
    }

    @action
    editEmailAudience() {
        this.openSection = 'emailRecipients';
    }

    @action
    async confirm() {
        const publishOptions = this.args.publishOptions;

        // Only warn when recipients without access actually exist. The count is
        // exact (owners/admins only), so this never fires a false alarm — and
        // it's re-evaluated on every attempt, so adding a preview or removing
        // those recipients makes it go away.
        if (publishOptions.mightWarnRecipientsReceiveFullEmail) {
            const [noAccessCount, totalCount] = await Promise.all([
                publishOptions.countNoAccessRecipients(),
                publishOptions.countAllRecipients()
            ]);

            if (noAccessCount > 0) {
                const result = await this.modals.open(PaidPostPreviewWarningModal, {
                    noAccessCount,
                    // when the whole audience lacks access there's no one else
                    // receiving it legitimately, so the copy drops "too"
                    allLackAccess: totalCount > 0 && noAccessCount >= totalCount,
                    visibility: publishOptions.post.visibility,
                    tierNames: publishOptions.postTierNames,
                    tierCount: publishOptions.postTierCount
                });

                if (result === 'editor') {
                    // place the paywall for them rather than dropping them into
                    // the editor with nothing inserted and no way back
                    this.args.addPublicPreview?.();
                    this.args.close();
                    return;
                }

                if (result !== 'continue') {
                    return;
                }
            }
        }

        this.args.confirm();
    }
}
