import Controller from '@ember/controller';
import {action} from '@ember/object';
import {htmlSafe} from '@ember/template';
import {inject} from 'ghost-admin/decorators/inject';
import {inject as service} from '@ember/service';
import {tracked} from '@glimmer/tracking';

export default class TiersController extends Controller {
    @service settings;

    @inject config;

    @tracked iconStyle = '';
    @tracked showFreeMembershipModal = false;

    constructor() {
        super(...arguments);
        this.iconStyle = this.setIconStyle();
    }

    get tiers() {
        return this.model.sortBy('name');
    }

    setIconStyle() {
        let icon = this.config.icon;
        if (icon) {
            return htmlSafe(`background-image: url(${icon})`);
        }
        icon = 'https://static.ghost.org/v4.0.0/images/ghost-orb-2.png';
        return htmlSafe(`background-image: url(${icon})`);
    }

    @action
    closeFreeMembershipModal() {
        this.showFreeMembershipModal = false;
    }
}
