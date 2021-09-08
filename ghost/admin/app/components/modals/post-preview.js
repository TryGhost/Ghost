import Component from '@glimmer/component';
import {action} from '@ember/object';
import {tracked} from '@glimmer/tracking';

export default class ModalPostPreviewComponent extends Component {
    @tracked tab = 'browser';

    @action
    changeTab(tab) {
        this.tab = tab;
    }
}
