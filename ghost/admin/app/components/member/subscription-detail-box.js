import Component from '@glimmer/component';
import {action} from '@ember/object';
import {tracked} from '@glimmer/tracking';

export default class SubscriptionDetailBox extends Component {
    @tracked showDetails = false;

    @action
    toggleSubscriptionExpanded() {
        this.showDetails = !this.showDetails;
    }
}