import Component from '@glimmer/component';
import {action} from '@ember/object';

export default class GhAppComponent extends Component {
    @action
    setBodyClass() {
        document.body.classList.toggle('settings-menu-expanded', this.args.showSettingsMenu);
    }
}
