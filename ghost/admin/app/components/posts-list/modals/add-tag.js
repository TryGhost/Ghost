import Component from '@glimmer/component';
import DS from 'ember-data'; // eslint-disable-line
import {action} from '@ember/object';
import {inject as service} from '@ember/service';
import {task} from 'ember-concurrency';
import {tracked} from '@glimmer/tracking';
const {Errors} = DS;

export default class AddTag extends Component {
    @service store;

    #availableTags = null;

    @tracked
        selectedTags = [];

    @tracked
        errors = Errors.create();

    get availableTags() {
        return this.#availableTags || [];
    }

    get hasValidated() {
        return ['tags'];
    }

    constructor() {
        super(...arguments);
        // perform a background query to fetch all users and set `availableTags`
        // to a live-query that will be immediately populated with what's in the
        // store and be updated when the above query returns
        this.store.query('tag', {limit: 'all'});
        this.#availableTags = this.store.peekAll('tag');

        // Destroy unsaved new tags (otherwise we could select them again -> create them again)
        this.#availableTags.forEach((tag) => {
            if (tag.isNew) {
                tag.destroyRecord();
            }
        });
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
    handleCreate(nameInput) {
        let potentialTagName = nameInput.trim();

        let isAlreadySelected = !!this.#findTagByName(potentialTagName, this.selectedTags);

        if (isAlreadySelected) {
            return;
        }

        let tagToAdd = this.#findTagByName(potentialTagName, this.#availableTags);

        if (!tagToAdd) {
            tagToAdd = this.store.createRecord('tag', {
                name: potentialTagName
            });

            tagToAdd.updateVisibility();
        }

        this.selectedTags = this.selectedTags.concat(tagToAdd);
    }

    @action
    shouldAllowCreate(nameInput) {
        return !this.#findTagByName(nameInput.trim(), this.#availableTags);
    }

    #findTagByName(name, tags) {
        let withMatchingName = function (tag) {
            return tag.name.toLowerCase() === name.toLowerCase();
        };
        return tags.find(withMatchingName);
    }
}
