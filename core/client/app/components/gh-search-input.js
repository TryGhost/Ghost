import Ember from 'ember';
import {request as ajax} from 'ic-ajax';
/* global key */

export default Ember.Component.extend({

    selection: null,
    content: [],
    isLoading: false,
    contentExpiry: 60 * 1000,
    contentExpiresAt: false,

    posts: Ember.computed.filterBy('content', 'category', 'Posts'),
    pages: Ember.computed.filterBy('content', 'category', 'Pages'),
    users: Ember.computed.filterBy('content', 'category', 'Users'),

    _store: Ember.inject.service('store'),
    _routing: Ember.inject.service('-routing'),
    _selectize: Ember.computed(function () {
        return this.$('select')[0].selectize;
    }),

    refreshContent: function () {
        var promises = [],
            now = new Date(),
            contentExpiry = this.get('contentExpiry'),
            contentExpiresAt = this.get('contentExpiresAt'),
            self = this;

        if (self.get('isLoading') || contentExpiresAt > now) { return; }

        self.set('isLoading', true);
        promises.pushObject(this._loadPosts());
        promises.pushObject(this._loadUsers());

        Ember.RSVP.all(promises).then(function () { }).finally(function () {
            self.set('isLoading', false);
            self.set('contentExpiresAt', new Date(now.getTime() + contentExpiry));
        });
    },

    _loadPosts: function () {
        var store = this.get('_store'),
            postsUrl = store.adapterFor('post').urlForFindQuery({}, 'post') + '/',
            postsQuery = {fields: 'id,title,page', limit: 'all', status: 'all', staticPages: 'all'},
            content = this.get('content'),
            self = this;

        return ajax(postsUrl, {data: postsQuery}).then(function (posts) {
            content.removeObjects(self.get('posts'));
            content.removeObjects(self.get('pages'));
            content.pushObjects(posts.posts.map(function (post) {
                return {
                    id: post.id,
                    title: post.title,
                    category: post.page ? 'Pages' : 'Posts'
                };
            }));
        });
    },

    _loadUsers: function () {
        var store = this.get('_store'),
            usersUrl = store.adapterFor('user').urlForFindQuery({}, 'user') + '/',
            usersQuery = {fields: 'name,slug', limit: 'all'},
            content = this.get('content'),
            self = this;

        return ajax(usersUrl, {data: usersQuery}).then(function (users) {
            content.removeObjects(self.get('users'));
            content.pushObjects(users.users.map(function (user) {
                return {
                    id: user.slug,
                    title: user.name,
                    category: 'Users'
                };
            }));
        });
    },

    _setKeymasterScope: function () {
        key.setScope('search-input');
    },

    _resetKeymasterScope: function () {
        key.setScope('default');
    },

    willDestroy: function () {
        this._resetKeymasterScope();
    },

    actions: {
        openSelected: function (selected) {
            var transition = null,
                self = this;

            if (!selected) { return; }

            if (selected.category === 'Posts' || selected.category === 'Pages') {
                transition = self.get('_routing.router').transitionTo('editor.edit', selected.id);
            }

            if (selected.category === 'Users') {
                transition = self.get('_routing.router').transitionTo('team.user', selected.id);
            }

            self.set('selection', '');
            transition.then(function () {
                if (self.get('_selectize').$control_input.is(':focus')) {
                    self._setKeymasterScope();
                }
            });
        },

        focusInput: function () {
            this.get('_selectize').focus();
        },

        onFocus: function () {
            this._setKeymasterScope();
            this.refreshContent();
        },

        onBlur: function () {
            this._resetKeymasterScope();
        }
    }

});
