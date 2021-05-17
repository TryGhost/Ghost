import Component from '@glimmer/component';
import {action} from '@ember/object';
import {inject as service} from '@ember/service';

export default class SettingsMembersDefaultPostAccess extends Component {
    @service settings;

    get options() {
        return [{
            name: 'Public',
            description: 'All site visitors to your site, no login required',
            value: 'public',
            icon: 'globe',
            icon_color: 'green'
        }, {
            name: 'Members only',
            description: 'All logged-in members',
            value: 'members',
            icon: 'globe',
            icon_color: 'green'
        }, {
            name: 'Paid-members only',
            description: 'Only logged-in members with an active Stripe subscription',
            value: 'paid',
            icon: 'globe',
            icon_color: 'green'
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
