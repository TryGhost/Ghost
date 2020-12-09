import Component from '@glimmer/component';
import {action} from '@ember/object';
import {run} from '@ember/runloop';
import {inject as service} from '@ember/service';
import {tracked} from '@glimmer/tracking';

class MembersFieldMapping {
    @tracked _mapping = {};

    constructor(mapping) {
        if (mapping) {
            for (const [key, value] of Object.entries(mapping)) {
                this._mapping[value] = key;
            }
        }
    }

    get(key) {
        return this._mapping[key];
    }

    toJSON() {
        return this._mapping;
    }

    getKeyByValue(searchedValue) {
        for (const [key, value] of Object.entries(this._mapping)) {
            if (value === searchedValue) {
                return key;
            }
        }

        return null;
    }

    updateMapping(from, to) {
        for (const key in this._mapping) {
            if (this.get(key) === to) {
                this._mapping[key] = null;
            }
        }

        this._mapping[from] = to;

        // trigger an update
        // eslint-disable-next-line no-self-assign
        this._mapping = this._mapping;
    }
}

export default class GhMembersImportTable extends Component {
    @tracked dataPreviewIndex = 0;

    @service memberImportValidator;

    constructor(...args) {
        super(...args);
        const mapping = this.memberImportValidator.check(this.args.data);
        this.data = this.args.data;
        this.mapping = new MembersFieldMapping(mapping);
        run.schedule('afterRender', () => this.args.setMapping(this.mapping));
    }

    get currentlyDisplayedData() {
        let rows = [];

        if (this.data && this.data.length && this.mapping) {
            let currentRecord = this.data[this.dataPreviewIndex];

            for (const [key, value] of Object.entries(currentRecord)) {
                rows.push({
                    key: key,
                    value: value,
                    mapTo: this.mapping.get(key)
                });
            }
        }

        return rows;
    }

    get hasNextRecord() {
        return this.data && !!(this.data[this.dataPreviewIndex + 1]);
    }

    get hasPrevRecord() {
        return this.data && !!(this.data[this.dataPreviewIndex - 1]);
    }

    get currentRecord() {
        return this.dataPreviewIndex + 1;
    }

    get allRecords() {
        if (this.data) {
            return this.data;
        } else {
            return 0;
        }
    }

    @action
    updateMapping(mapFrom, mapTo) {
        this.mapping.updateMapping(mapFrom, mapTo);
        this.args.setMapping(this.mapping);
    }

    @action
    next() {
        if (this.hasNextRecord) {
            this.dataPreviewIndex += 1;
        }
    }

    @action
    prev() {
        if (this.hasPrevRecord) {
            this.dataPreviewIndex -= 1;
        }
    }
}
