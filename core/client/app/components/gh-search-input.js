import Ember from 'ember';

export default Ember.TextField.extend({

    // TODO:
    // - Add event handlers for items being clicked/selected
    // - Prevent keyPress event from bubbling so we don't navigate through posts
    // - Use separate {post/tag/user}Result models that deal with partial records

    // BUGS:
    // - 'Loading...' still displayed for empty result sets
    // - keyPress events are being swallowed by key combos
    //   (eg. can't type 'k' and typing 'c' opens new post)

    // ISSUE:
    // - Potential for data to become stale if other users are also editing
    //   (or current user editing if we go with separate results models)

    classNames: ['gh-nav-search-input', 'gh-input'],

    initializeTypeahead: Ember.on('didInsertElement', function () {
        Ember.run.scheduleOnce('afterRender', this, '_initializeTypeahead');
    }),

    _initializeTypeahead: function () {
        this.$().typeahead({
            highlight: true,
            classNames: {
                menu: 'dropdown-menu',
                cursor: 'active'
            }
        },
        {
            name: 'posts',
            source: this.postsQuery.bind(this),
            display: function (post) {
                return post.get('title');
            },
            templates: {
                header: '<h4>Posts</h4>',
                pending: '<h4>Posts</h4><p>Loading...</p>',
                empty: ''
            }
        },
        {
            name: 'tags',
            source: this.tagsQuery.bind(this),
            display: function (tag) {
                return tag.get('name');
            },
            templates: {
                header: '<h4>Tags</h4>',
                pending: '<h4>Tags</h4><p>Loading...</p>',
                empty: ''
            }
        },
        {
            name: 'users',
            source: this.usersQuery.bind(this),
            display: function (user) {
                return user.get('name');
            },
            templates: {
                header: '<h4>Users</h4>',
                pending: '<h4>Users</h4><p>Loading...</p>',
                empty: ''
            }
        });
    },

    postsQuery: function (query, sync, async) {
        var self = this;

        if (this.get('posts')) {
            this.postsFilter(query, sync);
        } else {
            sync([]);
            this.store.find('post', {limit: 'all'}).then(function (posts) {
                self.set('posts', posts);
                self.postsFilter(query, async);
            });
        }
    },

    postsFilter: function (query, callback) {
        var posts = this.get('posts'),
            filteredPosts;

        query = query.toLowerCase();

        filteredPosts = posts.filter(function (post) {
            return post.get('title').toLowerCase().indexOf(query) !== -1;
        });

        callback(filteredPosts);
    },

    tagsQuery: function (query, sync, async) {
        var self = this;

        if (this.get('tags')) {
            this.tagsFilter(query, sync);
        } else {
            sync([]);
            this.store.find('tag', {limit: 'all'}).then(function (tags) {
                self.set('tags', tags);
                self.tagsFilter(query, async);
            });
        }
    },

    tagsFilter: function (query, callback) {
        var tags = this.get('tags'),
            filteredTags;

        query = query.toLowerCase();

        filteredTags = tags.filter(function (tag) {
            return tag.get('name').toLowerCase().indexOf(query) !== -1;
        });

        callback(filteredTags);
    },

    usersQuery: function (query, sync, async) {
        var self = this;

        if (this.get('users')) {
            this.usersFilter(query, sync);
        } else {
            sync([]);
            this.store.find('user', {limit: 'all'}).then(function (users) {
                self.set('users', users);
                self.usersFilter(query, async);
            });
        }
    },

    usersFilter: function (query, callback) {
        var users = this.get('users'),
            filteredUsers;

        query = query.toLowerCase();

        filteredUsers = users.filter(function (user) {
            return user.get('name').toLowerCase().indexOf(query) !== -1;
        });

        callback(filteredUsers);
    },

    destroyTypeahead: Ember.on('willDestroyElement', function () {
        this.$().typeahead('destroy');
    })

});
