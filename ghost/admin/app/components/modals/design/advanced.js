import Component from '@glimmer/component';
import {inject as service} from '@ember/service';

export default class ModalsDesignAdvancedComponent extends Component {
    @service store;

    get themes() {
        return this.store.peekAll('theme');
    }
}
