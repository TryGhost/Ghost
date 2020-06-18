import Component from '@glimmer/component';
import {action} from '@ember/object';
import {tracked} from '@glimmer/tracking';

export default class GhMembersImportTable extends Component {
    @tracked dataPreviewIndex = 0;

    get currentlyDisplayedData() {
        if (this.args && this.args.importData) {
            return this.args.importData[this.dataPreviewIndex];
        }

        return {};
    }

    @action
    next() {
        const nextValue = this.dataPreviewIndex + 1;

        if (this.args.importData[nextValue]) {
            this.dataPreviewIndex = nextValue;
        }
    }

    @action
    prev() {
        const nextValue = this.dataPreviewIndex - 1;

        if (this.args.importData[nextValue]) {
            this.dataPreviewIndex = nextValue;
        }
    }
}
