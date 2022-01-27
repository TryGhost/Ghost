import Component from '@glimmer/component';
import {action} from '@ember/object';

export default class SettingsDefaultEmailRecipientsComponent extends Component {
    get options() {
        return [{
            name: 'Whoever has access to the post',
            description: 'Free posts to everyone, premium posts sent to paid members',
            value: 'visibility',
            icon: 'members-post',
            icon_color: 'green'
        }, {
            name: 'All members',
            description: 'Everyone who is subscribed to newsletter updates, whether free or paid members',
            value: 'all-members',
            icon: 'members-all',
            icon_color: 'blue'
        }, {
            name: 'Paid-members only',
            description: 'People who have a premium subscription',
            value: 'paid-only',
            icon: 'members-paid',
            icon_color: 'pink'
        }, {
            name: 'Specific people',
            description: 'Only people with any of the selected tiers or labels',
            value: 'segment',
            icon: 'members-segment',
            icon_color: 'yellow'
        }, {
            name: 'Usually nobody',
            description: 'Newsletters are off for new posts, but can be enabled when needed',
            value: 'none',
            icon: 'no-members',
            icon_color: 'midlightgrey-d2'
        }];
    }

    get selectedOption() {
        return this.options.find(o => o.value === this.args.recipients);
    }

    @action
    setRecipients(option) {
        this.args.onRecipientsChange(option.value);
    }
}
