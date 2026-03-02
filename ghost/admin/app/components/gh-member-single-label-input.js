import Component from '@glimmer/component';
import {action} from '@ember/object';
import {inject as service} from '@ember/service';
import {task} from 'ember-concurrency';
import {tracked} from '@glimmer/tracking';

export default class GhMemberSingleLabelInput extends Component {
    @service store;
    @service labelsManager;

    @tracked selectedLabel;
    @tracked _availableLabels = [];
    @tracked _hasLoaded = false;

    get availableLabels() {
        return this.labelsManager.sortLabels(this._availableLabels);
    }

    constructor(...args) {
        super(...args);
        this.loadLabelsTask.perform();
    }

    @task
    *loadLabelsTask() {
        const labels = yield this.store.query('label', {limit: 100, page: 1, order: 'name asc'});
        this._availableLabels = labels.toArray();
        this._hasLoaded = true;

        this.selectedLabel = this.args.label || this.availableLabels[0]?.get('id');
        this.args.onChange(this.selectedLabel);
    }

    @action
    updateLabel(newLabel) {
        this.selectedLabel = newLabel;
        this.args.onChange(newLabel);
    }
}
