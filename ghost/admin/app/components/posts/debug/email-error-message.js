import Component from '@glimmer/component';
import {action} from '@ember/object';
import {tracked} from '@glimmer/tracking';

export default class EmailErrorMessage extends Component {
    @tracked more = false;

    @action
    setup(element) {
        const errorContainer = element.querySelector('span');
        if (element.offsetWidth <= errorContainer.offsetWidth) {
            this.more = true;
        }
    }
}
