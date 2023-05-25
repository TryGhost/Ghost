import Component from '@glimmer/component';
import {action} from '@ember/object';

export default class StyleSelect extends Component {
    get options() {
        return [{
            name: 'All in one',
            description: 'A branded form ready to be dropped into any site.',
            value: 'all-in-one',
            icon: 'members-post',
            icon_color: 'blue'
        }, {
            name: 'Minimal',
            description: 'A simple form with just an email field.',
            value: 'minimal',
            icon: 'members-all',
            icon_color: 'pink'
        }];
    }

    get selectedOption() {
        return this.options.find(o => o.value === this.args.value);
    }

    @action
    setRecipients(option) {
        this.args.onChange(option.value);
    }
}
