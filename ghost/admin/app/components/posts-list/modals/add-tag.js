import Component from '@glimmer/component';
import {action} from '@ember/object';
import {inject as service} from '@ember/service';
import {tracked} from '@glimmer/tracking';

export default class AddTag extends Component {
    @service store;

    #availableTags = null;

    @tracked
        selectedTags = [];

    get availableTags() {
        return this.#availableTags || [];
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
