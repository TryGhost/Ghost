import Component from '@glimmer/component';
import config from 'ghost-admin/config/environment';
import {inject as service} from '@ember/service';

export default class AboutModal extends Component {
    @service config;
    @service upgradeStatus;

    constructor() {
        super(...arguments);
        if (this.isTesting === undefined) {
            this.isTesting = config.environment === 'test';
        }
    }
}
