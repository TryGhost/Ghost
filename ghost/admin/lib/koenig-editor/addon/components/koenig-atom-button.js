import Component from '@glimmer/component';
import {action} from '@ember/object';
import {tracked} from '@glimmer/tracking';

export default class KoenigAtomButtonComponent extends Component {
    @tracked isHovered = false;

    @action
    deleteButton() {
        // noop
    }
}
