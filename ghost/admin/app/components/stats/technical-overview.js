import Component from '@glimmer/component';
import {action} from '@ember/object';
import {tracked} from '@glimmer/tracking';

export default class KpisOverview extends Component {
    @tracked selected = 'devices';
    @tracked totals = null;

    constructor() {
        super(...arguments);
    }

    willDestroy() {
        super.willDestroy();
    }

    @action
    changeTabToDevices() {
        this.selected = 'devices';
    }

    @action
    changeTabToBrowsers() {
        this.selected = 'browsers';
    }

    @action
    changeTabToOSs() {
        this.selected = 'os';
    }

    get devicesTabSelected() {
        return (this.selected === 'devices');
    }

    get browsersTabSelected() {
        return (this.selected === 'browsers');
    }

    get osTabSelected() {
        return (this.selected === 'os');
    }
}
