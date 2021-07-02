import Component from '@glimmer/component';
import {action} from '@ember/object';
import {inject as service} from '@ember/service';

export default class SettingsMembersDefaultPostAccess extends Component {
    @service settings;
    @service feature;

    get options() {
        const defaultOptions = [{
            name: 'Public',
            description: 'All site visitors to your site, no login required',
            value: 'public',
            icon: 'globe',
            icon_color: 'green'
        }, {
            name: 'Members only',
            description: 'All logged-in members',
            value: 'members',
            icon: 'members-all',
            icon_color: 'blue'
        }, {
            name: 'Paid-members only',
            description: 'Only logged-in members with an active Stripe subscription',
            value: 'paid',
            icon: 'members-paid',
            icon_color: 'pink'
        }];
        if (this.feature.get('multipleProducts')) {
            defaultOptions.push({
                name: 'A segment',
                description: 'Members with any of the selected products',
                value: 'filter',
                icon: 'members-paid',
                icon_color: 'yellow'
            });
        }
        return defaultOptions;
    }

    get hasVisibilityFilter() {
        return this.feature.get('multipleProducts') && !['public', 'members', 'paid'].includes(this.settings.get('defaultContentVisibility'));
    }

    get selectedOption() {
        if (this.settings.get('membersSignupAccess') === 'none') {
            return this.options.find(o => o.value === 'public');
        }
        if (!['public', 'members', 'paid'].includes(this.settings.get('defaultContentVisibility'))) {
            return this.options.find(o => o.value === 'filter');
        }
        return this.options.find(o => o.value === this.settings.get('defaultContentVisibility'));
    }

    @action
    setVisibility(segment) {
        if (segment) {
            this.settings.set('defaultContentVisibility', segment);
        }
    }

    @action
    setDefaultContentVisibility(option) {
        if (this.settings.get('membersSignupAccess') !== 'none') {
            if (option.value === 'filter') {
                this.settings.set('defaultContentVisibility', '');
            } else {
                this.settings.set('defaultContentVisibility', option.value);
            }
        }
    }
}
