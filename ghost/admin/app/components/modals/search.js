import Component from '@glimmer/component';
import {action} from '@ember/object';

export default class SearchModalComponent extends Component {
    @action
    focusFirstInput(mouseEvent) {
        mouseEvent.target.querySelector('input')?.focus();
    }
}
