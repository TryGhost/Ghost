import Component from '@glimmer/component';
import {action} from '@ember/object';
import {inject as service} from '@ember/service';
import {tracked} from '@glimmer/tracking';

export default class GhMemberLabelInput extends Component {
    @service store;

    @tracked selectedLabel;

    get availableLabels() {
        return this._availableLabels.toArray().sort((labelA, labelB) => {
            return labelA.name.localeCompare(labelB.name, undefined, {ignorePunctuation: true});
        });
    }

    get availableLabelNames() {
        return this.availableLabels.map(label => label.name.toLowerCase());
    }

    constructor(...args) {
        super(...args);
        // perform a background query to fetch all users and set `availableLabels`
        // to a live-query that will be immediately populated with what's in the
        // store and be updated when the above query returns
        this.store.query('label', {limit: 'all'});
        this._availableLabels = this.store.peekAll('label');
        this.selectedLabel = this.args.label || this.availableLabels[0]?.get('id');
        this.args.onChange(this.selectedLabel);
    }

    @action
    updateLabel(newLabel) {
        // update labels
        this.selectedLabel = newLabel;
        this.args.onChange(newLabel);
    }
}
