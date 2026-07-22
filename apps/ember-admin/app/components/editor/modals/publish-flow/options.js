import Component from '@glimmer/component';
import PaidPostPreviewWarningModal from '../paid-post-preview-warning';
import {action} from '@ember/object';
import {inject as service} from '@ember/service';
import {tracked} from '@glimmer/tracking';

export default class PublishFlowOptions extends Component {
    @service modals;

    @tracked openSection = null;

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
        if (this.args.publishOptions.shouldWarnRecipientsReceiveFullEmail) {
            const result = await this.modals.open(PaidPostPreviewWarningModal);

            if (result === 'editor') {
                this.args.close();
                return;
            }

            if (result !== 'continue') {
                return;
            }
        }

        this.args.confirm();
    }
}
