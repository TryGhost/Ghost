import Component from '@glimmer/component';
import {action} from '@ember/object';
import {inject as service} from '@ember/service';

export default class SettingsMembersSubscriptionAccess extends Component {
    @service settings;

    get options() {
        return [{
            name: 'Anyone can sign up',
            description: 'All visitors will be able to subscribe and sign in',
            value: 'all',
            icon: 'globe',
            icon_color: 'green'
        }, {
            name: 'Only people I invite',
            description: 'People can sign in from your site but won\'t be able to sign up',
            value: 'invite',
            icon: 'email-love-letter',
            icon_color: 'blue'
        }, {
            name: 'Nobody',
            description: 'Disable all member features, including newsletters',
            value: 'none',
            icon: 'no-members',
            icon_color: 'midlightgrey-d2'
        }];
    }

    get selectedOption() {
        return this.options.find(o => o.value === this.settings.membersSignupAccess);
    }

    @action
    setSignupAccess(option) {
        this.settings.membersSignupAccess = option.value;
        this.args.onChange?.(option.value);

        if (option.value === 'none') {
            this.settings.defaultContentVisibility = 'public';
        }
    }
}
