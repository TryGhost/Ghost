import Component from '@glimmer/component';
import {action} from '@ember/object';

export default class StyleSelect extends Component {
    get options() {
        return [{
            name: 'Branded',
            value: 'all-in-one'
        }, {
            name: 'Minimal',
            value: 'minimal'
        }];
    }

    get selectedOption() {
        return this.options.find(o => o.value === this.args.value);
    }

    @action
    setRecipients(option) {
        this.args.onChange(option.value);
    }

    @action
    changeOption(option) {
        this.option = option;
    }
}
