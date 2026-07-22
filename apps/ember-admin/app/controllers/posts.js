import Controller from '@ember/controller';
import SelectionList from 'ghost-admin/components/posts-list/selection-list';
import {DEFAULT_QUERY_PARAMS} from 'ghost-admin/helpers/reset-query-params';
import {action} from '@ember/object';
import {escapeNqlString} from 'ghost-admin/utils/escape-nql-string';
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

const ALL_AUTHORS_OPTION = {name: 'All authors', slug: null};
const ALL_TAGS_OPTION = {name: 'All tags', slug: null};

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

    staticAuthorOptions = [ALL_AUTHORS_OPTION];
    staticTagOptions = [ALL_TAGS_OPTION];

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

    get selectedTag() {
        if (this.tag === null) {
            return ALL_TAGS_OPTION;
        }

        return this.store.peekAll('tag').findBy('slug', this.tag) || {slug: '!unknown'};
    }

    get selectedAuthor() {
        if (this.author === null) {
            return ALL_AUTHORS_OPTION;
        }

        return this.store.peekAll('user').findBy('slug', this.author) || {slug: '!unknown'};
    }

    @action
    loadTagsPage({limit, page}) {
        return this.store.query('tag', {limit, page, order: 'name asc'});
    }

    @action
    searchTagsPage(term, {limit, page}) {
        return this.store.query('tag', {filter: `tags.name:~${escapeNqlString(term)}`, limit, page, order: 'name asc'});
    }

    @action
    sortTags(tags) {
        return this.tagsManager.sortTags(tags);
    }

    @action
    loadAuthorsPage({limit, page}) {
        return this.store.query('user', {limit, page, order: 'name asc'});
    }

    @action
    searchAuthorsPage(term, {limit, page}) {
        return this.store.query('user', {filter: `name:~${escapeNqlString(term)}`, limit, page, order: 'name asc'});
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
