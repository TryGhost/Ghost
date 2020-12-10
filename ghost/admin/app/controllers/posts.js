import Controller from '@ember/controller';
import {DEFAULT_QUERY_PARAMS} from 'ghost-admin/helpers/reset-query-params';
import {alias} from '@ember/object/computed';
import {computed} from '@ember/object';
import {get} from '@ember/object';
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

export default Controller.extend({
    feature: service(),
    session: service(),
    store: service(),

    // default values for these are set in `init` and defined in `helpers/reset-query-params`
    queryParams: ['type', 'access', 'author', 'tag', 'order'],

    _hasLoadedTags: false,
    _hasLoadedAuthors: false,
    _hasLoadedSnippets: false,

    availableTypes: null,
    availableVisibilities: null,
    availableOrders: null,

    init() {
        this._super(...arguments);
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
    },

    postsInfinityModel: alias('model'),

    showingAll: computed('type', 'author', 'tag', function () {
        let {type, author, tag, visibility} = this.getProperties(['type', 'visibility', 'author', 'tag']);

        return !type && !visibility && !author && !tag;
    }),

    selectedType: computed('type', function () {
        let types = this.get('availableTypes');
        return types.findBy('value', this.get('type')) || {value: '!unknown'};
    }),

    selectedVisibility: computed('visibility', function () {
        let visibilities = this.get('availableVisibilities');
        return visibilities.findBy('value', this.get('visibility')) || {value: '!unknown'};
    }),

    selectedOrder: computed('order', function () {
        let orders = this.get('availableOrders');
        return orders.findBy('value', this.get('order')) || {value: '!unknown'};
    }),

    _availableTags: computed(function () {
        return this.get('store').peekAll('tag');
    }),

    availableTags: computed('_availableTags.[]', function () {
        let tags = this.get('_availableTags')
            .filter(tag => tag.get('id') !== null)
            .sort((tagA, tagB) => tagA.name.localeCompare(tagB.name, undefined, {ignorePunctuation: true}));
        let options = tags.toArray();
        options.unshiftObject({name: 'All tags', slug: null});

        return options;
    }),

    selectedTag: computed('tag', '_availableTags.[]', function () {
        let tag = this.get('tag');
        let tags = this.get('availableTags');

        return tags.findBy('slug', tag) || {slug: '!unknown'};
    }),

    _availableAuthors: computed(function () {
        return this.get('store').peekAll('user');
    }),

    availableAuthors: computed('_availableAuthors.[]', function () {
        let authors = this.get('_availableAuthors');
        let options = authors.toArray();

        options.unshiftObject({name: 'All authors', slug: null});

        return options;
    }),

    selectedAuthor: computed('author', 'availableAuthors.[]', function () {
        let author = this.get('author');
        let authors = this.get('availableAuthors');

        return authors.findBy('slug', author) || {slug: '!unknown'};
    }),

    snippets: computed(function () {
        return this.store.peekAll('snippet');
    }),

    actions: {
        changeType(type) {
            this.set('type', get(type, 'value'));
        },

        changeVisibility(visibility) {
            this.set('visibility', get(visibility, 'value'));
        },

        changeAuthor(author) {
            this.set('author', get(author, 'slug'));
        },

        changeTag(tag) {
            this.set('tag', get(tag, 'slug'));
        },

        changeOrder(order) {
            this.set('order', get(order, 'value'));
        },

        openEditor(post) {
            this.transitionToRoute('editor.edit', 'post', post.get('id'));
        }
    }
});
