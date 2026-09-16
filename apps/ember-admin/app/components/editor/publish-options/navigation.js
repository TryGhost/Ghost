import Component from '@glimmer/component';
import {action} from '@ember/object';

export default class NavigationOption extends Component {
    @action
    onChange(event) {
        event.preventDefault();
        this.args.publishOptions.setNavigationPlacement(event.target.value);
    }
}
