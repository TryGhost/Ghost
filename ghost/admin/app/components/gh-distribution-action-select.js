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
    setDistributionAction(newAction) {
        this.distributionValue = newAction;
        this.args.post.emailOnly = (newAction.value === 'send') ? true : false;
        this.args.setDistributionAction(newAction.value);
    }
}
