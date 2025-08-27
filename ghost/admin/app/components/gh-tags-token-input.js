import Component from '@glimmer/component';
import {TrackedArray} from 'tracked-built-ins';
import {action} from '@ember/object';
import {inject as service} from '@ember/service';
import {task} from 'ember-concurrency';
import {tracked} from '@glimmer/tracking';

const PAGE_SIZE = 100;

export default class GhTagsTokenInput extends Component {
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
        this.addInitialTags(this.args.selected?.toArray ? this.args.selected.toArray() : (this.args.selected || []));
    }

    get availableTags() {
        const selectedTags = this.args.selected || [];
        return this.tagsManager.sortTags(this._initialTags.filter(tag => !selectedTags.includes(tag)));
    }

    // if we only have one page of tags available or we've already loaded all tags
    // then we can use the client-side search
    get useServerSideSearch() {
        const hasLoadedAnyTags = !!this._initialTagsMeta;
        const hasLoadedAllTags = hasLoadedAnyTags && parseInt(this._initialTagsMeta.pagination.pages, 10) === parseInt(this._initialTagsMeta.pagination.page, 10);

        return !hasLoadedAllTags;
    }

    @action
    addInitialTags(tags) {
        const selectedTags = this.args.selected || [];
        const deduplicatedTags = tags.filter(tag => !selectedTags.includes(tag));
        this._initialTags.push(...deduplicatedTags);
    }

    @action
    addSearchedTags(tags) {
        const selectedTags = this.args.selected || [];
        const deduplicatedTags = tags.filter(tag => !selectedTags.includes(tag));
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
            if (!this.useServerSideSearch) {
                return;
            }

            if (this.searchTagsTask.isRunning) {
                return;
            }

            if (this._searchedTagsMeta?.pagination && this._searchedTagsMeta.pagination.pages <= this._searchedTagsMeta.pagination.page) {
                return;
            }

            const page = this._searchedTagsMeta.pagination.page + 1;
            const tags = yield this.tagsManager.searchTagsTask.perform(this._searchedTagsQuery, {page});
            this.addSearchedTags(tags.toArray());
            this._searchedTagsMeta = tags.meta;
        } else {
            if (this._initialTagsMeta?.pagination && this._initialTagsMeta.pagination.pages <= this._initialTagsMeta.pagination.page) {
                return;
            }

            const page = this._initialTagsMeta?.pagination.page ? this._initialTagsMeta.pagination.page + 1 : 1;
            const tags = yield this.store.query('tag', {limit: PAGE_SIZE, page, order: 'name asc'});
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
    showCreateWhen(term) {
        const availableTagNames = this._searchedTags.map(tag => tag.name.toLowerCase());
        availableTagNames.push(...this.args.selected.map(tag => tag.name.toLowerCase()));

        const foundMatchingTagName = availableTagNames.includes(term.toLowerCase());
        return !foundMatchingTagName;
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

        return this._searchedTags.find(withMatchingName) || this._initialTags.find(withMatchingName);
    }
}
