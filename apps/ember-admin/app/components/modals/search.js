import Component from '@glimmer/component';
import {action} from '@ember/object';

export default class SearchModal extends Component {
    @action
    focusFirstInput(mouseEvent) {
        mouseEvent.target.querySelector('input')?.focus();
    }
}
