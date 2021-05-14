import Component from '@glimmer/component';
import {action} from '@ember/object';
import {inject as service} from '@ember/service';

export default class SettingsMembersDefaultPostAccess extends Component {
    @service settings;

    get options() {
        return [{
            name: 'Public',
            description: 'All site visitors to your site, no login required',
            value: 'public'
        }, {
            name: 'Members only',
            description: 'All logged-in members',
            value: 'members'
        }, {
            name: 'Paid-members only',
            description: 'Only logged-in mmembers with an active Stripe subscription',
            value: 'paid'
        }];
    }

    get selectedOption() {
        if (this.settings.get('membersSignupAccess') === 'none') {
            return this.options.find(o => o.value === 'public');
        }

        return this.options.find(o => o.value === this.settings.get('defaultContentVisibility'));
    }

    @action
    setDefaultContentVisibility(option) {
        if (this.settings.get('membersSignupAccess') !== 'none') {
            this.settings.set('defaultContentVisibility', option.value);
        }
    }
}
