import Component from '@glimmer/component';
import {action} from '@ember/object';
import {tracked} from '@glimmer/tracking';

export default class GhDistributionActionSelect extends Component {
    @tracked
    distributionValue;

    constructor(...args) {
        super(...args);

        let distributionValue = this.args.post.emailOnly
            ? 'send'
            : (this.args.post.emailRecipientFilter !== 'none')
                ? 'publish_send'
                : 'publish';
        this.distributionValue = this.availablePublishActions.findBy('value', distributionValue);
    }

    get availablePublishActions() {
        return [{
            value: 'publish_send',
            name: 'publish & send'
        }, {
            value: 'publish',
            name: 'publish'
        }, {
            value: 'send',
            name: 'send'
        }];
    }

    @action
    setPublishAction(newAction) {
        this.distributionValue = newAction;

        if (newAction.value === 'publish_send') {
            this.args.post.emailOnly = false;
            this.args.post.emailRecipientFilter = null;
        } else if (newAction.value === 'publish') {
            this.args.post.emailOnly = false;
            this.args.post.emailRecipientFilter = 'none';
        } else if (newAction.value === 'send') {
            this.args.post.emailOnly = true;
            this.args.post.emailRecipientFilter = null;
        }

        this.args.post.save();
    }
}
