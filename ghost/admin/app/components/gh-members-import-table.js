import Component from '@glimmer/component';
import {action} from '@ember/object';
import {tracked} from '@glimmer/tracking';

export default class GhMembersImportTable extends Component {
    @tracked dataPreviewIndex = 0;

    get currentlyDisplayedData() {
        let rows = [];

        if (this.args && this.args.importData && this.args.mapping && this.args.mapping.mapping) {
            let currentRecord = this.args.importData[this.dataPreviewIndex];

            for (const [key, value] of Object.entries(currentRecord)) {
                rows.push({
                    key: key,
                    value: value,
                    mapTo: this.args.mapping.get(key)
                });
            }
        }

        return rows;
    }

    @action
    updateMapping(mapFrom, mapTo) {
        this.args.updateMapping(mapFrom, mapTo);
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
