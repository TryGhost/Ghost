import Component from '@glimmer/component';
import {action} from '@ember/object';

export default class NavigationOption extends Component {
    @action
    onChange(event) {
        event.preventDefault();
        const placement = event.target.value;
        this.args.publishOptions.setNavigationPlacement(placement === 'none' ? null : placement);
    }
}
