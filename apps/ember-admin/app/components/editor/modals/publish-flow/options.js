import Component from '@glimmer/component';
import {action} from '@ember/object';
import {tracked} from '@glimmer/tracking';

export default class PublishFlowOptions extends Component {
    @tracked openSection = null;

    @action
    toggleSection(section) {
        if (section === this.openSection) {
            this.openSection = null;
        } else {
            this.openSection = section;
        }
    }
}
