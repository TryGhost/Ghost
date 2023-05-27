import Controller from '@ember/controller';
import SelectionList from 'ghost-admin/utils/selection-list';
import {DEFAULT_QUERY_PARAMS} from 'ghost-admin/helpers/reset-query-params';
import {action} from '@ember/object';
import {inject} from 'ghost-admin/decorators/inject';
import {inject as service} from '@ember/service';
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
    value: 'paid'
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

    _availableTags = this.store.peekAll('tag');
    _availableAuthors = this.store.peekAll('user');

    _hasLoadedTags = false;
    _hasLoadedAuthors = false;

    constructor() {
        super(...arguments);

        Object.assign(this, DEFAULT_QUERY_PARAMS.posts);
    }

    get postsInfinityModel() {
        return this.model;
    }

    get totalPosts() {
        return this.model.meta?.pagination?.total ?? 0;
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
        const tags = this._availableTags
            .filter(tag => tag.get('id') !== null)
            .sort((tagA, tagB) => tagA.name.localeCompare(tagB.name, undefined, {ignorePunctuation: true}));

        const options = tags.toArray();
        options.unshift({name: 'All tags', slug: null});

        return options;
    }

    get selectedTag() {
        const tag = this.tag;
        const tags = this.availableTags;

        return tags.findBy('slug', tag) || {slug: '!unknown'};
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
        this.router.transitionTo('editor.edit', 'post', post.id);
    }
}
