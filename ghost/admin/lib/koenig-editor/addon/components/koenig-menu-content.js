import Component from '@glimmer/component';
import {action} from '@ember/object';

export default class KoenigMenuContentComponent extends Component {
    @action
    scrollIntoView(element, [doScroll]) {
        if (doScroll) {
            element.scrollIntoView({
                behavior: 'smooth',
                block: 'nearest'
            });
        }
    }
}
