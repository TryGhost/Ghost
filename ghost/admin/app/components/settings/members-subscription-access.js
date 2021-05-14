import Component from '@glimmer/component';
import {action} from '@ember/object';
import {inject as service} from '@ember/service';

export default class SettingsMembersSubscriptionAccess extends Component {
    @service settings;

    get options() {
        return [{
            name: 'Anyone can sign up',
            description: 'All visitors will be able to subscribe and sign in',
            value: 'all'
        }, {
            name: 'Only people I invite',
            description: 'People can sign in from your site but won\'t be able to sign up',
            value: 'invite'
        }, {
            name: 'Nobody',
            description: 'No one will be able to subscribe or sign in',
            value: 'none'
        }];
    }

    get selectedOption() {
        return this.options.find(o => o.value === this.settings.get('membersSignupAccess'));
    }

    @action
    setSignupAccess(option) {
        this.settings.set('membersSignupAccess', option.value);

        if (option.value === 'none') {
            this.settings.set('defaultContentVisibility', 'public');
        }
    }
}
