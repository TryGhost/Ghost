import Component from '@glimmer/component';
import {action} from '@ember/object';
import {schedule} from '@ember/runloop';
import {inject as service} from '@ember/service';
import {tracked} from '@glimmer/tracking';

export default class GhNavMenuComponent extends Component {
    @service settings;
    @service ui;

    @tracked firstRender = true;

    @action
    updateFirstRender() {
        schedule('afterRender', this, () => {
            this.firstRender = false;
        });
    }
}
