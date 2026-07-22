import Component from '@glimmer/component';

export default class PublishLimitModal extends Component {
    get headerMessage() {
        if (this.args.data.code === 'EMAIL_VERIFICATION_NEEDED') {
            return 'Hold up, we\'re missing some details';
        } else {
            return 'Upgrade to enable publishing';
        }
    }
}
