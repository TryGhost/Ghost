import Component from '@glimmer/component';
import {action} from '@ember/object';

export default class GhFontSelector extends Component {
    get options() {
        return [{
            name: 'Elegant serif',
            description: 'Beautiful lines with great readability',
            value: 'serif'
        }, {
            name: 'Clean sans-serif',
            description: 'A more minimal style with sharp lines',
            value: 'sans_serif'
        }];
    }

    get selectedOption() {
        return this.options.find(o => o.value === this.args.selected);
    }

    @action
    selectOption(option) {
        this.args.onChange(option.value);
    }
}
