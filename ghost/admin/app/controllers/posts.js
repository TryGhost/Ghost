import Controller from '@ember/controller';
import SelectionList from 'ghost-admin/components/posts-list/selection-list';
import {DEFAULT_QUERY_PARAMS} from 'ghost-admin/helpers/reset-query-params';
import {TrackedArray} from 'tracked-built-ins';
import {action} from '@ember/object';
import {inject} from 'ghost-admin/decorators/inject';
import {inject as service} from '@ember/service';
import {task} from 'ember-concurrency';
import {tracked} from '@glimmer/tracking';

const TYPES = [{
    name: 'All posts',
    value: null
}, {
    name: 'Draft posts',
    value: 'draft'
}, {
    name: 'Published posts',
    value: 'published'
}, {
    name: 'Email only posts',
    value: 'sent'
}, {
    name: 'Scheduled posts',
    value: 'scheduled'
}, {
    name: 'Featured posts',
    value: 'featured'
}];

const VISIBILITIES = [{
    name: 'All access',
    value: null
}, {
    name: 'Public',
    value: 'public'
}, {
    name: 'Members-only',
    value: 'members'
}, {
    name: 'Paid members-only',
    value: '[paid,tiers]'
}];

const ORDERS = [{
    name: 'Newest first',
    value: null
}, {
    name: 'Oldest first',
    value: 'published_at asc'
}, {
    name: 'Recently updated',
    value: 'updated_at desc'
}];

export default class PostsController extends Controller {
    @service feature;
    @service router;
    @service session;
    @service store;
    @service tagsManager;

    @inject config;

    // default values for these are set in constructor and defined in `helpers/reset-query-params`
    queryParams = ['type', 'visibility', 'author', 'tag', 'order'];

    @tracked type = null;
    @tracked visibility = null;
    @tracked author = null;
    @tracked tag = null;
    @tracked order = null;
    @tracked selectionList = new SelectionList(this.postsInfinityModel);

    availableTypes = TYPES;
    availableVisibilities = VISIBILITIES;
    availableOrders = ORDERS;

    _availableAuthors = this.store.peekAll('user');

    // Set & used by the posts route
    _hasLoadedAuthors = false;
    _hasLoadedFilteredTag = false;

    @tracked _initialTags = new TrackedArray();
    _initialTagsMeta = null;
    _hasLoadedInitialTags = false;
    @tracked _searchedTags = new TrackedArray();
    _searchedTagsQuery = null;
    _searchedTagsMeta = null;

    constructor() {
        super(...arguments);

        Object.assign(this, DEFAULT_QUERY_PARAMS.posts);
    }

    get showingAll() {
        const {type, author, tag, visibility} = this;

        return !type && !visibility && !author && !tag;
    }

    get selectedType() {
        return this.availableTypes.findBy('value', this.type) || {value: '!unknown'};
    }

    get selectedVisibility() {
        return this.availableVisibilities.findBy('value', this.visibility) || {value: '!unknown'};
    }

    get selectedOrder() {
        return this.availableOrders.findBy('value', this.order) || {value: '!unknown'};
    }

    get availableTags() {
        let options = [{name: 'All tags', slug: null}];

        options = options.concat(this.tagsManager.sortTags(this._initialTags));

        if (this.tag && !options.findBy('slug', this.tag)) {
            const foundTag = this.tagsManager.loadedTags.findBy('slug', this.tag);
            if (foundTag) {
                options.push(foundTag);
            }
        }

        return options;
    }

    @action
    async loadInitialTags() {
        if (!this._hasLoadedInitialTags) {
            await this.loadMoreTagsTask.perform(false);
            this._hasLoadedInitialTags = true;
        }
    }

    @task({drop: true})
    *loadMoreTagsTask(isSearch = false) {
        if (isSearch) {
            if (this.searchTagsTask.isRunning) {
                return;
            }

            if (this._searchedTagsMeta && this._searchedTagsMeta.pagination.pages <= this._searchedTagsMeta.pagination.page) {
                return;
            }

            const page = this._searchedTagsMeta.pagination.page + 1;
            const tags = yield this.tagsManager.searchTagsTask.perform(this._searchedTagsQuery, {page});
            this._searchedTags.push(...this.tagsManager.sortTags(tags.toArray()));
            this._searchedTagsMeta = tags.meta;
        } else {
            if (this._initialTagsMeta && this._initialTagsMeta?.pagination.pages <= this._initialTagsMeta.pagination.page) {
                return;
            }

            const page = this._initialTagsMeta?.pagination.page ? this._initialTagsMeta.pagination.page + 1 : 1;
            const tags = yield this.store.query('tag', {limit: 100, page, order: 'name asc'});
            this._initialTags.push(...tags.toArray());
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
        this._searchedTags = new TrackedArray(this.tagsManager.sortTags(tags.toArray()));
        return this._searchedTags;
    }

    get selectedTag() {
        if (this.tag === null) {
            return this.availableTags[0];
        } else {
            return this.tagsManager.loadedTags.findBy('slug', this.tag) || {slug: '!unknown'};
        }
    }

    get availableAuthors() {
        const authors = this._availableAuthors;
        const options = authors.toArray();

        options.unshift({name: 'All authors', slug: null});

        return options;
    }

    get selectedAuthor() {
        let author = this.author;
        let authors = this.availableAuthors;

        return authors.findBy('slug', author) || {slug: '!unknown'};
    }

    @action
    changeType(type) {
        this.type = type.value;
    }

    @action
    changeVisibility(visibility) {
        this.visibility = visibility.value;
    }

    @action
    changeAuthor(author) {
        this.author = author.slug;
    }

    @action
    changeTag(tag) {
        this.tag = tag.slug;
    }

    @action
    changeOrder(order) {
        this.order = order.value;
    }

    @action
    openEditor(post) {
        this.router.transitionTo('lexical-editor.edit', 'post', post.id);
    }
}
