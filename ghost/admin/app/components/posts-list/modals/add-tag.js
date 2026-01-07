import Component from '@glimmer/component';
import DS from 'ember-data'; // eslint-disable-line
import {action} from '@ember/object';
import {inject as service} from '@ember/service';
import {task} from 'ember-concurrency';
import {tracked} from '@glimmer/tracking';
const {Errors} = DS;

export default class AddTag extends Component {
    @service store;

    @tracked selectedTags = [];
    @tracked errors = Errors.create();

    get hasValidated() {
        return ['tags'];
    }

    @action
    handleChange(newTags) {
        this.selectedTags.forEach((tag) => {
            if (!newTags.includes(tag) && tag.isNew) {
                tag.destroyRecord();
            }
        });
        this.selectedTags = newTags;
    }

    @task
    *confirm() {
        if (this.selectedTags.length === 0) {
            this.errors.add('tags', 'Select at least one tag');
            return;
        }
        this.errors.clear();
        return yield this.args.data.confirm.perform(this.selectedTags);
    }

    @action
    handleCreate(tagToAdd) {
        this.selectedTags = this.selectedTags.concat(tagToAdd);
    }
}
