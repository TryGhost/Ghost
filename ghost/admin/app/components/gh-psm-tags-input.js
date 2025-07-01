import Component from '@glimmer/component';
import {TrackedArray} from 'tracked-built-ins';
import {action} from '@ember/object';
import {inject as service} from '@ember/service';
import {task} from 'ember-concurrency';
import {tracked} from '@glimmer/tracking';

export default class GhPsmTagsInput extends Component {
    @service store;
    @service tagsManager;

    // internal attrs
    @tracked _initialTags = new TrackedArray();
    @tracked _searchedTags = new TrackedArray();

    _initialTagsMeta = null;
    _hasLoadedInitialTags = false;
    _searchedTagsQuery = null;
    _searchedTagsMeta = null;

    _powerSelectAPI = null;

    constructor() {
        super(...arguments);
        this.addInitialTags(this.args.post.get('tags').toArray());
    }

    get availableTags() {
        return this.tagsManager.sortTags(this._initialTags.filter(tag => !this.args.post.get('tags').includes(tag)));
    }

    get searchedTags() {
        return this.tagsManager.sortTags(this._searchedTags.filter(tag => !this.args.post.get('tags').includes(tag)));
    }

    get availableTagNames() {
        return this.availableTags.map(tag => tag.name.toLowerCase());
    }

    @action
    addInitialTags(tags) {
        const deduplicatedTags = tags.filter(tag => !this.args.post.get('tags').includes(tag));
        this._initialTags.push(...deduplicatedTags);
    }

    @action
    addSearchedTags(tags) {
        const deduplicatedTags = tags.filter(tag => !this.args.post.get('tags').includes(tag));
        this._searchedTags.push(...deduplicatedTags);
    }

    @action
    registerPowerSelectAPI(api) {
        this._powerSelectAPI = api;
    }

    @action
    async loadInitialTags() {
        if (!this._hasLoadedInitialTags) {
            await this.loadMoreTagsTask.perform(false);
            this._hasLoadedInitialTags = true;
        }
    }

    @task
    *loadMoreTagsTask() {
        const isSearch = !!this._powerSelectAPI.searchText;
        if (isSearch) {
            if (this.searchTagsTask.isRunning) {
                return;
            }

            if (this._searchedTagsMeta && this._searchedTagsMeta.pagination.pages <= this._searchedTagsMeta.pagination.page) {
                return;
            }

            const page = this._searchedTagsMeta.pagination.page + 1;
            const tags = yield this.tagsManager.searchTagsTask.perform(this._searchedTagsQuery, {page});
            this.addSearchedTags(tags.toArray());
            this._searchedTagsMeta = tags.meta;
        } else {
            if (this._initialTagsMeta && this._initialTagsMeta?.pagination.pages <= this._initialTagsMeta.pagination.page) {
                return;
            }

            const page = this._initialTagsMeta?.pagination.page ? this._initialTagsMeta.pagination.page + 1 : 1;
            const tags = yield this.store.query('tag', {limit: 100, page, order: 'name asc'});
            this.addInitialTags(tags.toArray());
            this._initialTagsMeta = tags.meta;
        }
    }

    @task
    *searchTagsTask(term) {
        this._searchedTagsQuery = term;
        const tags = yield this.tagsManager.searchTagsTask.perform(term);
        this._searchedTagsMeta = tags.meta;

        // we need to create a tracked array for vertical-collection to update as new options are loaded
        // because we can't rely on power-select re-rendering as @options changes via auto template updates
        this._searchedTags = new TrackedArray();
        this.addSearchedTags(tags.toArray());
        return this._searchedTags;
    }

    @action
    hideCreateOptionOnMatchingTag(term) {
        return !this.availableTagNames.includes(term.toLowerCase());
    }

    @action
    updateTags(newTags) {
        let currentTags = this.args.post.get('tags');

        // destroy new+unsaved tags that are no longer selected
        currentTags.forEach(function (tag) {
            if (!newTags.includes(tag) && tag.get('isNew')) {
                tag.destroyRecord();
            }
        });

        // update tags
        this.args.post.set('tags', newTags);
        if (this.savePostOnChange) {
            return this.savePostOnChange();
        }
    }

    @action
    createTag(tagNameAttr) {
        let currentTags = this.args.post.get('tags');
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

        // push tag onto post relationship
        return currentTags.pushObject(tagToAdd);
    }

    // methods

    _findTagByName(name) {
        let withMatchingName = function (tag) {
            return tag.name.toLowerCase() === name.toLowerCase();
        };
        return this.availableTags.find(withMatchingName);
    }
}
