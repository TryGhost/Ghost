/* global key */
/* jscs:disable requireCamelCaseOrUpperCaseIdentifiers */
import Component from 'ember-component';
import RSVP from 'rsvp';
import computed from 'ember-computed';
import run from 'ember-runloop';
import injectService from 'ember-service/inject';
import {isBlank, isEmpty} from 'ember-utils';

export function computedGroup(category) {
    return computed('content', 'currentSearch', function () {
        if (!this.get('currentSearch') || !this.get('content')) {
            return [];
        }

        return this.get('content').filter((item) => {
            let search = new RegExp(this.get('currentSearch'), 'ig');

            return (item.category === category) &&
                item.title.match(search);
        });
    });
}

export default Component.extend({

    selection: null,
    content: [],
    isLoading: false,
    contentExpiry: 10 * 1000,
    contentExpiresAt: false,
    currentSearch: '',

    posts: computedGroup('Posts'),
    pages: computedGroup('Pages'),
    users: computedGroup('Users'),
    tags: computedGroup('Tags'),

    _store: injectService('store'),
    _routing: injectService('-routing'),
    ajax: injectService(),
    notifications: injectService(),

    refreshContent() {
        let promises = [];
        let now = new Date();
        let contentExpiry = this.get('contentExpiry');
        let contentExpiresAt = this.get('contentExpiresAt');

        if (this.get('isLoading') || contentExpiresAt > now) {
            return RSVP.resolve();
        }

        this.set('isLoading', true);
        this.set('content', []);
        promises.pushObject(this._loadPosts());
        promises.pushObject(this._loadUsers());
        promises.pushObject(this._loadTags());

        return RSVP.all(promises).then(() => { }).finally(() => {
            this.set('isLoading', false);
            this.set('contentExpiresAt', new Date(now.getTime() + contentExpiry));
        });
    },

    groupedContent: computed('posts', 'pages', 'users', 'tags', function () {
        let groups = [];

        if (!isEmpty(this.get('posts'))) {
            groups.pushObject({groupName: 'Posts', options: this.get('posts')});
        }

        if (!isEmpty(this.get('pages'))) {
            groups.pushObject({groupName: 'Pages', options: this.get('pages')});
        }

        if (!isEmpty(this.get('users'))) {
            groups.pushObject({groupName: 'Users', options: this.get('users')});
        }

        if (!isEmpty(this.get('tags'))) {
            groups.pushObject({groupName: 'Tags', options: this.get('tags')});
        }

        return groups;
    }),

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
        }).catch((error) => {
            this.get('notifications').showAPIError(error, {key: 'search.loadPosts.error'});
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
        }).catch((error) => {
            this.get('notifications').showAPIError(error, {key: 'search.loadUsers.error'});
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
        }).catch((error) => {
            this.get('notifications').showAPIError(error, {key: 'search.loadTags.error'});
        });
    },

    _performSearch(term, resolve, reject) {
        if (isBlank(term)) {
            return resolve([]);
        }

        this.refreshContent().then(() => {
            this.set('currentSearch', term);

            return resolve(this.get('groupedContent'));
        }).catch(reject);
    },

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
            if (!selected) {
                return;
            }

            if (selected.category === 'Posts' || selected.category === 'Pages') {
                let id = selected.id.replace('post.', '');
                this.get('_routing.router').transitionTo('editor.edit', id);
            }

            if (selected.category === 'Users') {
                let id = selected.id.replace('user.', '');
                this.get('_routing.router').transitionTo('team.user', id);
            }

            if (selected.category === 'Tags') {
                let id = selected.id.replace('tag.', '');
                this.get('_routing.router').transitionTo('settings.tags.tag', id);
            }
        },

        onFocus() {
            this._setKeymasterScope();
        },

        onBlur() {
            this._resetKeymasterScope();
        },

        search(term) {
            return new RSVP.Promise((resolve, reject) => {
                run.debounce(this, this._performSearch, term, resolve, reject, 200);
            });
        }
    }

});
