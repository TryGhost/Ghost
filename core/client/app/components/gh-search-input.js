/* global key */
/* jscs:disable requireCamelCaseOrUpperCaseIdentifiers */
import Ember from 'ember';

const {
    $,
    Component,
    RSVP,
    computed,
    inject: {service},
    observer
} = Ember;
const {filterBy} = computed;

export default Component.extend({

    selection: null,
    content: [],
    isLoading: false,
    contentExpiry: 10 * 1000,
    contentExpiresAt: false,

    posts: filterBy('content', 'category', 'Posts'),
    pages: filterBy('content', 'category', 'Pages'),
    users: filterBy('content', 'category', 'Users'),
    tags:  filterBy('content', 'category', 'Tags'),

    _store: service('store'),
    _routing: service('-routing'),
    ajax: service(),

    _selectize: computed(function () {
        return this.$('select')[0].selectize;
    }),

    refreshContent() {
        let promises = [];
        let now = new Date();
        let contentExpiry = this.get('contentExpiry');
        let contentExpiresAt = this.get('contentExpiresAt');

        if (this.get('isLoading') || contentExpiresAt > now) {
            return;
        }

        this.set('isLoading', true);
        this.set('content', []);
        promises.pushObject(this._loadPosts());
        promises.pushObject(this._loadUsers());
        promises.pushObject(this._loadTags());

        RSVP.all(promises).then(() => { }).finally(() => {
            this.set('isLoading', false);
            this.set('contentExpiresAt', new Date(now.getTime() + contentExpiry));
        });
    },

    _loadPosts() {
        let store = this.get('_store');
        let postsUrl = `${store.adapterFor('post').urlForQuery({}, 'post')}/`;
        let postsQuery = {fields: 'id,title,page', limit: 'all', status: 'all', staticPages: 'all'};
        let content = this.get('content');

        return this.get('ajax').request(postsUrl, {data: postsQuery}).then((posts) => {
            content.pushObjects(posts.posts.map((post) => {
                return {
                    id: `post.${post.id}`,
                    title: post.title,
                    category: post.page ? 'Pages' : 'Posts'
                };
            }));
        });
    },

    _loadUsers() {
        let store = this.get('_store');
        let usersUrl = `${store.adapterFor('user').urlForQuery({}, 'user')}/`;
        let usersQuery = {fields: 'name,slug', limit: 'all'};
        let content = this.get('content');

        return this.get('ajax').request(usersUrl, {data: usersQuery}).then((users) => {
            content.pushObjects(users.users.map((user) => {
                return {
                    id: `user.${user.slug}`,
                    title: user.name,
                    category: 'Users'
                };
            }));
        });
    },

    _loadTags() {
        let store = this.get('_store');
        let tagsUrl = `${store.adapterFor('tag').urlForQuery({}, 'tag')}/`;
        let tagsQuery = {fields: 'name,slug', limit: 'all'};
        let content = this.get('content');

        return this.get('ajax').request(tagsUrl, {data: tagsQuery}).then((tags) => {
            content.pushObjects(tags.tags.map((tag) => {
                return {
                    id: `tag.${tag.slug}`,
                    title: tag.name,
                    category: 'Tags'
                };
            }));
        });
    },

    _keepSelectionClear: observer('selection', function () {
        if (this.get('selection') !== null) {
            this.set('selection', null);
        }
    }),

    _setKeymasterScope() {
        key.setScope('search-input');
    },

    _resetKeymasterScope() {
        key.setScope('default');
    },

    willDestroy() {
        this._super(...arguments);
        this._resetKeymasterScope();
    },

    actions: {
        openSelected(selected) {
            let transition = null;

            if (!selected) {
                return;
            }

            if (selected.category === 'Posts' || selected.category === 'Pages') {
                let id = selected.id.replace('post.', '');
                transition = this.get('_routing.router').transitionTo('editor.edit', id);
            }

            if (selected.category === 'Users') {
                let id = selected.id.replace('user.', '');
                transition = this.get('_routing.router').transitionTo('team.user', id);
            }

            if (selected.category === 'Tags') {
                let id = selected.id.replace('tag.', '');
                transition = this.get('_routing.router').transitionTo('settings.tags.tag', id);
            }

            transition.then(() => {
                if (this.get('_selectize').$control_input.is(':focus')) {
                    this._setKeymasterScope();
                }
            });
        },

        focusInput() {
            this.get('_selectize').focus();
        },

        onInit() {
            let selectize = this.get('_selectize');
            let html = '<div class="dropdown-empty-message">Nothing found&hellip;</div>';

            selectize.$empty_results_container = $(html);
            selectize.$empty_results_container.hide();
            selectize.$dropdown.append(selectize.$empty_results_container);
        },

        onFocus() {
            this._setKeymasterScope();
            this.refreshContent();
        },

        onBlur() {
            let selectize = this.get('_selectize');

            this._resetKeymasterScope();
            selectize.$empty_results_container.hide();
        },

        onType() {
            let selectize = this.get('_selectize');

            if (!selectize.hasOptions) {
                selectize.open();
                selectize.$empty_results_container.show();
            } else {
                selectize.$empty_results_container.hide();
            }
        }
    }

});
