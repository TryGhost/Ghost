import Component from '@glimmer/component';
import {action} from '@ember/object';
import {inject as service} from '@ember/service';
import {tracked} from '@glimmer/tracking';

export default class SettingsMembersSubscriptionAccess extends Component {
    @service settings;

    @tracked signupAccessOpen = false;

    @action
    toggleSignupAccess() {
        this.signupAccessOpen = !this.signupAccessOpen;
    }

    @action
    setSignupAccess(value) {
        this.settings.set('membersSignupAccess', value);
        this.settings.set('defaultContentVisibility', 'public');
    }
}
