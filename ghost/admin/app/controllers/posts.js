import Controller from '@ember/controller';
import classic from 'ember-classic-decorator';
import {DEFAULT_QUERY_PARAMS} from 'ghost-admin/helpers/reset-query-params';
import {action, computed, get} from '@ember/object';
import {alias} from '@ember/object/computed';
import {inject as service} from '@ember/service';

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
    name: 'Newest',
    value: null
}, {
    name: 'Oldest',
    value: 'published_at asc'
}, {
    name: 'Recently updated',
    value: 'updated_at desc'
}];

@classic
export default class PostsController extends Controller {
    @service feature;
    @service session;
    @service store;
    @service settings;
    @service config;

    // default values for these are set in `init` and defined in `helpers/reset-query-params`
    queryParams = ['type', 'access', 'author', 'tag', 'order'];

    _hasLoadedTags = false;
    _hasLoadedAuthors = false;
    _hasLoadedSnippets = false;
    availableTypes = null;
    availableVisibilities = null;
    availableOrders = null;

    init() {
        super.init(...arguments);
        this.availableTypes = TYPES;
        this.availableOrders = ORDERS;
        this.availableVisibilities = VISIBILITIES;
        this.setProperties(DEFAULT_QUERY_PARAMS.posts);

        if (this.feature.get('emailAnalytics') && !this.availableOrders.findBy('name', 'Open rate')) {
            this.availableOrders.push({
                name: 'Open rate',
                value: 'email.open_rate desc'
            });
        }
    }

    @alias('model')
        postsInfinityModel;

    @computed('type', 'author', 'tag')
    get showingAll() {
        let {type, author, tag, visibility} = this;

        return !type && !visibility && !author && !tag;
    }

    @computed('type')
    get selectedType() {
        let types = this.availableTypes;
        return types.findBy('value', this.type) || {value: '!unknown'};
    }

    @computed('visibility')
    get selectedVisibility() {
        let visibilities = this.availableVisibilities;
        return visibilities.findBy('value', this.visibility) || {value: '!unknown'};
    }

    @computed('order')
    get selectedOrder() {
        let orders = this.availableOrders;
        return orders.findBy('value', this.order) || {value: '!unknown'};
    }

    @computed
    get _availableTags() {
        return this.store.peekAll('tag');
    }

    @computed('_availableTags.[]')
    get availableTags() {
        let tags = this._availableTags
            .filter(tag => tag.get('id') !== null)
            .sort((tagA, tagB) => tagA.name.localeCompare(tagB.name, undefined, {ignorePunctuation: true}));
        let options = tags.toArray();
        options.unshiftObject({name: 'All tags', slug: null});

        return options;
    }

    @computed('tag', '_availableTags.[]')
    get selectedTag() {
        let tag = this.tag;
        let tags = this.availableTags;

        return tags.findBy('slug', tag) || {slug: '!unknown'};
    }

    @computed
    get _availableAuthors() {
        return this.store.peekAll('user');
    }

    @computed('_availableAuthors.[]')
    get availableAuthors() {
        let authors = this._availableAuthors;
        let options = authors.toArray();

        options.unshiftObject({name: 'All authors', slug: null});

        return options;
    }

    @computed('author', 'availableAuthors.[]')
    get selectedAuthor() {
        let author = this.author;
        let authors = this.availableAuthors;

        return authors.findBy('slug', author) || {slug: '!unknown'};
    }

    @computed
    get snippets() {
        return this.store.peekAll('snippet');
    }

    @action
    changeType(type) {
        this.set('type', get(type, 'value'));
    }

    @action
    changeVisibility(visibility) {
        this.set('visibility', get(visibility, 'value'));
    }

    @action
    changeAuthor(author) {
        this.set('author', get(author, 'slug'));
    }

    @action
    changeTag(tag) {
        this.set('tag', get(tag, 'slug'));
    }

    @action
    changeOrder(order) {
        this.set('order', get(order, 'value'));
    }

    @action
    openEditor(post) {
        this.transitionToRoute('editor.edit', 'post', post.get('id'));
    }
}
