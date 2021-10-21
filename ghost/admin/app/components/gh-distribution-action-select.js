import Component from '@glimmer/component';
import {action} from '@ember/object';

export default class GhDistributionActionSelect extends Component {
    availablePublishActions = [{
        value: 'publish_send',
        name: 'publish & send'
    }, {
        value: 'publish',
        name: 'publish'
    }, {
        value: 'send',
        name: 'send'
    }];

    get distributionValue() {
        return this.availablePublishActions.findBy('value', this.args.distributionAction);
    }

    @action
    setDistributionAction(newAction) {
        this.args.setDistributionAction(newAction.value);
    }
}
