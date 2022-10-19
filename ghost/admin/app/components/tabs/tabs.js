import Component from '@glimmer/component';
import {action} from '@ember/object';
import {tracked} from '@glimmer/tracking';

export default class TabsComponent extends Component {
    tabIds = [];
    tabCounter = 0;
    tabPanelCounter = 0;
    @tracked selectedIndex = this.args.defaultIndex ?? 0;

    @action
    handleSelect(index) {
        this.selectedIndex = index;
    }

    @action
    handleKeyup(event, index) {
        switch (event.key) {
        case 'ArrowLeft':
            this.selectedIndex = this.tabIds[index - 1] ? index - 1 : this.tabIds.length - 1;
            break;

        case 'ArrowRight':
            this.selectedIndex = this.tabIds[index + 1] ? index + 1 : 0;
            break;

        case 'Home':
            this.selectedIndex = 0;
            break;

        case 'End':
            this.selectedIndex = this.tabIds.length - 1;
            break;

        default:
            break;
        }

        const selectedNode = document.getElementById(this.tabIds[this.selectedIndex]);
        selectedNode.focus();
    }

    @action
    addTabId(id) {
        this.tabIds.push(id);

        return id;
    }

    @action
    addTabIndex() {
        const index = this.tabCounter;
        this.tabCounter = this.tabCounter + 1;

        return index;
    }

    @action
    addPanelIndex() {
        const index = this.tabPanelCounter;
        this.tabPanelCounter = this.tabPanelCounter + 1;

        return index;
    }
}
