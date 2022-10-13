import Component from '@glimmer/component';
import {action} from '@ember/object';
import {inject as service} from '@ember/service';
import {tracked} from '@glimmer/tracking';

export default class SettingsMembersDefaultPostAccess extends Component {
    @service settings;
    @service feature;
    @tracked showSegmentError;

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
            icon: 'members-all',
            icon_color: 'blue'
        }, {
            name: 'Paid-members only',
            description: 'Only logged-in members with an active Stripe subscription',
            value: 'paid',
            icon: 'members-paid',
            icon_color: 'pink'
        }, {
            name: 'Specific tier(s)',
            description: 'Members with any of the selected tiers',
            value: 'tiers',
            icon: 'members-segment',
            icon_color: 'yellow'
        }];
    }

    get hasVisibilityFilter() {
        return !['public', 'members', 'paid'].includes(this.settings.defaultContentVisibility);
    }

    get visibilityTiers() {
        const visibilityTiersData = this.settings.defaultContentVisibilityTiers;
        return (visibilityTiersData || []).map((id) => {
            return {id};
        });
    }

    get selectedOption() {
        if (this.settings.membersSignupAccess === 'none') {
            return this.options.find(o => o.value === 'public');
        }

        return this.options.find(o => o.value === this.settings.defaultContentVisibility);
    }

    @action
    setVisibility(segment) {
        if (segment) {
            const tierIds = segment?.map((tier) => {
                return tier.id;
            });
            this.settings.defaultContentVisibility = 'tiers';
            this.settings.defaultContentVisibilityTiers = tierIds;
            this.showSegmentError = false;
        } else {
            this.settings.defaultContentVisibility = '';
            this.showSegmentError = true;
        }
    }

    @action
    setDefaultContentVisibility(option) {
        if (this.settings.membersSignupAccess !== 'none') {
            this.settings.defaultContentVisibility = option.value;
            if (option.value === 'tiers') {
                this.settings.defaultContentVisibilityTiers = [];
            }
        }
    }
}
