import Component from '@glimmer/component';
import {action} from '@ember/object';
import {guidFor} from '@ember/object/internals';

export default class TabComponent extends Component {
    id = this.args.id(`tab-${guidFor(this)}`);
    index = this.args.index();

    get isSelectedTab() {
        return this.args.selectedIndex === this.index;
    }

    @action
    handleClick() {
        return this.args.onSelect(this.index);
    }

    @action
    handleKeyup(event) {
        event.stopPropagation();
        event.preventDefault();
        return this.args.onKeyup(event, this.index);
    }
}
