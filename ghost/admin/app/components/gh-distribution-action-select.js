import Component from '@glimmer/component';
import {action} from '@ember/object';
import {tracked} from '@glimmer/tracking';

export default class GhDistributionActionSelect extends Component {
    @tracked
    distributionValue;

    constructor(...args) {
        super(...args);

        let distributionValue = this.args.emailOnly
            ? 'send'
            : (this.args.emailRecipientFilter !== 'none')
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
        this.args.setDistributionAction(newAction.value);
    }
}
