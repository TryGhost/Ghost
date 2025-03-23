import Component from '@glimmer/component';

export default class PublishLimitModal extends Component {
    get headerMessage() {
        if (this.args.data.message?.match(/account is currently in review/gi)) {
            return 'Hold up, we\'re missing some details';
        } else {
            return 'Upgrade to enable publishing';
        }
    }
}
