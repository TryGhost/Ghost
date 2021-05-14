import Component from '@glimmer/component';
import {action} from '@ember/object';
import {inject as service} from '@ember/service';
import {tracked} from '@glimmer/tracking';

export default class SettingsMembersDefaultPostAccess extends Component {
    @service settings;

    @tracked postAccessOpen = false;

    @action
    togglePostAccess() {
        this.postAccessOpen = !this.postAccessOpen;
    }

    @action
    setDefaultContentVisibility(value) {
        if (this.settings.get('membersSignupAccess') !== 'none') {
            this.settings.set('defaultContentVisibility', value);
        }
    }
}
