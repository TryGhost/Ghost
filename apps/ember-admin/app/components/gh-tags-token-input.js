import Component from '@glimmer/component';
import {TrackedArray} from 'tracked-built-ins';
import {action} from '@ember/object';
import {escapeNqlString} from '../utils/escape-nql-string';
import {inject as service} from '@ember/service';

const SEARCH_DEBOUNCE_MS = 250;

export default class GhTagsTokenInput extends Component {
    @service store;
    @service tagsManager;

    _knownTags = new TrackedArray();

    @action
    loadTagsPage({limit, page}) {
        return this.store.query('tag', {limit, page, order: 'name asc'}).then((tags) => {
            this._addKnownTags(tags.toArray());
            return tags;
        });
    }

    @action
    searchTagsPage(term, {limit, page}) {
        return this.store.query('tag', {filter: `tags.name:~${escapeNqlString(term)}`, limit, page, order: 'name asc'}).then((tags) => {
            this._addKnownTags(tags.toArray());
            return tags;
        });
    }

    @action
    sortTags(tags) {
        return this.tagsManager.sortTags(tags);
    }

    @action
    showCreateWhen(term, tags) {
        const availableTagNames = tags.map(tag => tag.name.toLowerCase());
        availableTagNames.push(...(this.args.selected || []).map(tag => tag.name.toLowerCase()));

        const foundMatchingTagName = availableTagNames.includes(term.toLowerCase());
        return !foundMatchingTagName;
    }

    get searchDebounceMs() {
        return SEARCH_DEBOUNCE_MS;
    }

    @action
    updateTags(newTags) {
        let currentTags = this.args.selected || [];

        // destroy new+unsaved tags that are no longer selected
        currentTags.forEach(function (tag) {
            if (!newTags.includes(tag) && tag.get('isNew')) {
                tag.destroyRecord();
            }
        });

        // call the onChange callback
        if (this.args.onChange) {
            this.args.onChange(newTags);
        }
    }

    @action
    createTag(tagNameAttr) {
        let currentTags = this.args.selected || [];
        let currentTagNames = currentTags.map(tag => tag.get('name').toLowerCase());
        let tagToAdd;

        tagNameAttr = tagNameAttr.trim();

        // abort if tag is already selected
        if (currentTagNames.includes(tagNameAttr.toLowerCase())) {
            return;
        }

        // find existing tag if there is one
        tagToAdd = this._findTagByName(tagNameAttr);

        // create new tag if no match
        if (!tagToAdd) {
            tagToAdd = this.store.createRecord('tag', {
                name: tagNameAttr
            });

            // set to public/internal based on the tag name
            tagToAdd.updateVisibility();
        }

        // call the onCreate callback or default to adding the tag
        if (this.args.onCreate) {
            return this.args.onCreate(tagToAdd);
        } else {
            // default behavior: add to selected tags
            const newTags = [...currentTags, tagToAdd];
            this.updateTags(newTags);
        }
    }

    // methods

    _findTagByName(name) {
        let withMatchingName = function (tag) {
            if (tag.__isSuggestion__) {
                return false;
            }
            return tag.name.toLowerCase() === name.toLowerCase();
        };

        return this._knownTags.find(withMatchingName);
    }

    _addKnownTags(tags) {
        const knownTagIds = new Set(this._knownTags.map(tag => tag.id));
        const deduplicatedTags = tags.filter(tag => !knownTagIds.has(tag.id));
        this._knownTags.push(...deduplicatedTags);
    }
}
