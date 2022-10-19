import Component from '@glimmer/component';

export default class TabPanelComponent extends Component {
    index = this.args.index();

    get isSelectedTab() {
        return this.args.selectedIndex === this.index;
    }

    get tabId() {
        return this.args.tabIds[this.index];
    }
}
