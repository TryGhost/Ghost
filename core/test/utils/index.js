var Promise       = require('bluebird'),
    _             = require('lodash'),
    fs            = require('fs-extra'),
    path          = require('path'),
    uuid          = require('node-uuid'),
    db            = require('../../server/data/db'),
    migration     = require('../../server/data/migration/'),
    Models        = require('../../server/models'),
    SettingsAPI   = require('../../server/api/settings'),
    permissions   = require('../../server/permissions'),
    permsFixtures = require('../../server/data/migration/fixtures/permissions/permissions.json'),
    sequence      = require('../../server/utils/sequence'),
    DataGenerator = require('./fixtures/data-generator'),
    filterData    = require('./fixtures/filter-param'),
    API           = require('./api'),
    fork          = require('./fork'),
    config        = require('../../server/config'),

    fixtures,
    getFixtureOps,
    toDoList,
    postsInserted = 0,

    teardown,
    setup,
    doAuth,
    login,
    togglePermalinks,

    initFixtures,
    initData,
    clearData;

/** TEST FIXTURES **/
fixtures = {
    insertPosts: function insertPosts() {
        return Promise.resolve(db.knex('posts').insert(DataGenerator.forKnex.posts)).then(function () {
            return db.knex('tags').insert(DataGenerator.forKnex.tags);
        }).then(function () {
            return db.knex('posts_tags').insert(DataGenerator.forKnex.posts_tags);
        });
    },

    insertMultiAuthorPosts: function insertMultiAuthorPosts(max) {
        /*jshint unused:false*/
        var author,
            authors,
            i, j, k = postsInserted,
            posts = [];

        max = max || 50;
        // insert users of different roles
        return Promise.resolve(fixtures.createUsersWithRoles()).then(function () {
            // create the tags
            return db.knex('tags').insert(DataGenerator.forKnex.tags);
        }).then(function () {
            return db.knex('users').select('id');
        }).then(function (results) {
            authors = _.pluck(results, 'id');

            // Let's insert posts with random authors
            for (i = 0; i < max; i += 1) {
                author = authors[i % authors.length];
                posts.push(DataGenerator.forKnex.createGenericPost(k, null, null, author));
                k = k + 1;
            }

            // Keep track so we can run this function again safely
            postsInserted = k;

            return sequence(_.times(posts.length, function (index) {
                return function () {
                    return db.knex('posts').insert(posts[index]);
                };
            }));
        }).then(function () {
            return Promise.all([
                // PostgreSQL can return results in any order
                db.knex('posts').orderBy('id', 'asc').select('id'),
                db.knex('tags').select('id')
            ]);
        }).then(function (results) {
            var posts = _.pluck(results[0], 'id'),
                tags = _.pluck(results[1], 'id'),
                promises = [],
                i;

            if (max > posts.length) {
                throw new Error('Trying to add more posts_tags than the number of posts. ' + max + ' ' + posts.length);
            }

            for (i = 0; i < max; i += 1) {
                promises.push(DataGenerator.forKnex.createPostsTags(posts[i], tags[i % tags.length]));
            }

            return sequence(_.times(promises.length, function (index) {
                return function () {
                    return db.knex('posts_tags').insert(promises[index]);
                };
            }));
        });
    },

    insertMorePosts: function insertMorePosts(max) {
        var lang,
            status,
            posts = [],
            i, j, k = postsInserted;

        max = max || 50;

        for (i = 0; i < 2; i += 1) {
            lang = i % 2 ? 'en' : 'fr';
            posts.push(DataGenerator.forKnex.createGenericPost(k, null, lang));
            k = k + 1;

            for (j = 0; j < max; j += 1) {
                status = j % 2 ? 'draft' : 'published';
                posts.push(DataGenerator.forKnex.createGenericPost(k, status, lang));
                k = k + 1;
            }
        }

        // Keep track so we can run this function again safely
        postsInserted = k;

        return sequence(_.times(posts.length, function (index) {
            return function () {
                return db.knex('posts').insert(posts[index]);
            };
        }));
    },

    insertMoreTags: function insertMoreTags(max) {
        max = max || 50;
        var tags = [],
            tagName,
            i;

        for (i = 0; i < max; i += 1) {
            tagName = uuid.v4().split('-')[0];
            tags.push(DataGenerator.forKnex.createBasic({name: tagName, slug: tagName}));
        }

        return sequence(_.times(tags.length, function (index) {
            return function () {
                return db.knex('tags').insert(tags[index]);
            };
        }));
    },

    insertMorePostsTags: function insertMorePostsTags(max) {
        max = max || 50;

        return Promise.all([
            // PostgreSQL can return results in any order
            db.knex('posts').orderBy('id', 'asc').select('id'),
            db.knex('tags').select('id', 'name')
        ]).then(function (results) {
            var posts = _.pluck(results[0], 'id'),
                injectionTagId = _.chain(results[1])
                    .where({name: 'injection'})
                    .pluck('id')
                    .value()[0],
                promises = [],
                i;

            if (max > posts.length) {
                throw new Error('Trying to add more posts_tags than the number of posts.');
            }

            for (i = 0; i < max; i += 1) {
                promises.push(DataGenerator.forKnex.createPostsTags(posts[i], injectionTagId));
            }

            return sequence(_.times(promises.length, function (index) {
                return function () {
                    return db.knex('posts_tags').insert(promises[index]);
                };
            }));
        });
    },
    insertRoles: function insertRoles() {
        return db.knex('roles').insert(DataGenerator.forKnex.roles);
    },

    initOwnerUser: function initOwnerUser() {
        var user = DataGenerator.Content.users[0];

        user = DataGenerator.forKnex.createBasic(user);
        user = _.extend({}, user, {status: 'inactive'});

        return db.knex('roles').insert(DataGenerator.forKnex.roles).then(function () {
            return db.knex('users').insert(user);
        }).then(function () {
            return db.knex('roles_users').insert(DataGenerator.forKnex.roles_users[0]);
        });
    },

    insertOwnerUser: function insertOwnerUser() {
        var user;

        user = DataGenerator.forKnex.createUser(DataGenerator.Content.users[0]);

        return db.knex('users').insert(user).then(function () {
            return db.knex('roles_users').insert(DataGenerator.forKnex.roles_users[0]);
        });
    },

    overrideOwnerUser: function overrideOwnerUser(slug) {
        var user;

        user = DataGenerator.forKnex.createUser(DataGenerator.Content.users[0]);
        if (slug) {
            user.slug = slug;
        }

        return db.knex('users')
            .where('id', '=', '1')
            .update(user);
    },

    createUsersWithRoles: function createUsersWithRoles() {
        return db.knex('roles').insert(DataGenerator.forKnex.roles).then(function () {
            return db.knex('users').insert(DataGenerator.forKnex.users);
        }).then(function () {
            return db.knex('roles_users').insert(DataGenerator.forKnex.roles_users);
        });
    },

    createExtraUsers: function createExtraUsers() {
        // grab 3 more users
        var extraUsers = DataGenerator.Content.users.slice(2, 5);

        extraUsers = _.map(extraUsers, function (user) {
            return DataGenerator.forKnex.createUser(_.extend({}, user, {
                email: 'a' + user.email,
                slug: 'a' + user.slug
            }));
        });

        return db.knex('users').insert(extraUsers).then(function () {
            return db.knex('roles_users').insert([
                {user_id: 5, role_id: 1},
                {user_id: 6, role_id: 2},
                {user_id: 7, role_id: 3}
            ]);
        });
    },

    // Creates a client, and access and refresh tokens for user 3 (author)
    createTokensForUser: function createTokensForUser() {
        return db.knex('clients').insert(DataGenerator.forKnex.clients).then(function () {
            return db.knex('accesstokens').insert(DataGenerator.forKnex.createToken({user_id: 3}));
        }).then(function () {
            return db.knex('refreshtokens').insert(DataGenerator.forKnex.createToken({user_id: 3}));
        });
    },

    createInvitedUsers: function createInvitedUser() {
        // grab 3 more users
        var extraUsers = DataGenerator.Content.users.slice(2, 5);

        extraUsers = _.map(extraUsers, function (user) {
            return DataGenerator.forKnex.createUser(_.extend({}, user, {
                email: 'inv' + user.email,
                slug: 'inv' + user.slug,
                status: 'invited-pending'
            }));
        });

        return db.knex('users').insert(extraUsers).then(function () {
            return db.knex('roles_users').insert([
                {user_id: 8, role_id: 1},
                {user_id: 9, role_id: 2},
                {user_id: 10, role_id: 3}
            ]);
        });
    },

    insertOne: function insertOne(obj, fn) {
        return db.knex(obj)
           .insert(DataGenerator.forKnex[fn](DataGenerator.Content[obj][0]));
    },

    insertApps: function insertApps() {
        return db.knex('apps').insert(DataGenerator.forKnex.apps).then(function () {
            return db.knex('app_fields').insert(DataGenerator.forKnex.app_fields);
        });
    },

    getImportFixturePath: function (filename) {
        return path.resolve(__dirname + '/fixtures/import/' + filename);
    },

    getExportFixturePath: function (filename) {
        return path.resolve(__dirname + '/fixtures/export/' + filename + '.json');
    },

    loadExportFixture: function loadExportFixture(filename) {
        var filePath = this.getExportFixturePath(filename),
            readFile = Promise.promisify(fs.readFile);

        return readFile(filePath).then(function (fileContents) {
            var data;

            // Parse the json data
            try {
                data = JSON.parse(fileContents);
            } catch (e) {
                return new Error('Failed to parse the file');
            }

            return data;
        });
    },

    permissionsFor: function permissionsFor(obj) {
        var permsToInsert = permsFixtures.permissions[obj],
            permsRolesToInsert = permsFixtures.permissions_roles,
            actions = [],
            permissionsRoles = [],
            roles = {
                Administrator: 1,
                Editor: 2,
                Author: 3,
                Owner: 4
            };

        permsToInsert = _.map(permsToInsert, function (perms) {
            perms.object_type = obj;
            actions.push(perms.action_type);
            return DataGenerator.forKnex.createBasic(perms);
        });

        _.each(permsRolesToInsert, function (perms, role) {
            if (perms[obj]) {
                if (perms[obj] === 'all') {
                    _.each(actions, function (action, i) {
                        permissionsRoles.push({permission_id: (i + 1), role_id: roles[role]});
                    });
                } else {
                    _.each(perms[obj], function (action) {
                        permissionsRoles.push({permission_id: (_.indexOf(actions, action) + 1), role_id: roles[role]});
                    });
                }
            }
        });

        return db.knex('permissions').insert(permsToInsert).then(function () {
            return db.knex('permissions_roles').insert(permissionsRoles);
        });
    },
    insertClients: function insertClients() {
        return db.knex('clients').insert(DataGenerator.forKnex.clients);
    },
    insertAccessToken: function insertAccessToken(override) {
        return db.knex('accesstokens').insert(DataGenerator.forKnex.createToken(override));
    }
};

/** Test Utility Functions **/
initData = function initData() {
    return migration.init();
};

clearData = function clearData() {
    // we must always try to delete all tables
    return migration.reset();
};

toDoList = {
    app: function insertApp() { return fixtures.insertOne('apps', 'createApp'); },
    app_field: function insertAppField() {
        // TODO: use the actual app ID to create the field
        return fixtures.insertOne('apps', 'createApp').then(function () {
            return fixtures.insertOne('app_fields', 'createAppField');
        });
    },
    app_setting: function insertAppSetting() {
        // TODO: use the actual app ID to create the field
        return fixtures.insertOne('apps', 'createApp').then(function () {
            return fixtures.insertOne('app_settings', 'createAppSetting');
        });
    },
    permission: function insertPermission() { return fixtures.insertOne('permissions', 'createPermission'); },
    role: function insertRole() { return fixtures.insertOne('roles', 'createRole'); },
    roles: function insertRoles() { return fixtures.insertRoles(); },
    tag: function insertTag() { return fixtures.insertOne('tags', 'createTag'); },

    posts: function insertPosts() { return fixtures.insertPosts(); },
    'posts:mu': function insertMultiAuthorPosts() { return fixtures.insertMultiAuthorPosts(); },
    tags: function insertMoreTags() { return fixtures.insertMoreTags(); },
    apps: function insertApps() { return fixtures.insertApps(); },
    settings: function populateSettings() {
        return Models.Settings.populateDefaults().then(function () { return SettingsAPI.updateSettingsCache(); });
    },
    'users:roles': function createUsersWithRoles() { return fixtures.createUsersWithRoles(); },
    users: function createExtraUsers() { return fixtures.createExtraUsers(); },
    'user:token': function createTokensForUser() { return fixtures.createTokensForUser(); },
    owner: function insertOwnerUser() { return fixtures.insertOwnerUser(); },
    'owner:pre': function initOwnerUser() { return fixtures.initOwnerUser(); },
    'owner:post': function overrideOwnerUser() { return fixtures.overrideOwnerUser(); },
    'perms:init': function initPermissions() { return permissions.init(); },
    perms: function permissionsFor(obj) {
        return function permissionsForObj() { return fixtures.permissionsFor(obj); };
    },
    clients: function insertClients() { return fixtures.insertClients(); },
    filter: function createFilterParamFixtures() { return filterData(DataGenerator); }
};

/**
 * ## getFixtureOps
 *
 * Takes the arguments from a setup function and turns them into an array of promises to fullfil
 *
 * This is effectively a list of instructions with regard to which fixtures should be setup for this test.
  *  * `default` - a special option which will cause the full suite of normal fixtures to be initialised
  *  * `perms:init` - initialise the permissions object after having added permissions
  *  * `perms:obj` - initialise permissions for a particular object type
  *  * `users:roles` - create a full suite of users, one per role
 * @param {Object} toDos
 */
getFixtureOps = function getFixtureOps(toDos) {
    // default = default fixtures, if it isn't present, init with tables only
    var tablesOnly = !toDos.default,
        fixtureOps = [];

    // Database initialisation
    if (toDos.init || toDos.default) {
        fixtureOps.push(function initDB() {
            return migration.init(tablesOnly);
        });
        delete toDos.default;
        delete toDos.init;
    }

    // Go through our list of things to do, and add them to an array
    _.each(toDos, function (value, toDo) {
        var tmp;
        if (toDo !== 'perms:init' && toDo.indexOf('perms:') !== -1) {
            tmp = toDo.split(':');
            fixtureOps.push(toDoList[tmp[0]](tmp[1]));
        } else {
            fixtureOps.push(toDoList[toDo]);
        }
    });

    return fixtureOps;
};

// ## Test Setup and Teardown

initFixtures = function initFixtures() {
    var options = _.merge({init: true}, _.transform(arguments, function (result, val) {
            result[val] = true;
        })),
        fixtureOps = getFixtureOps(options);

    return sequence(fixtureOps);
};

/**
 * ## Setup Integration Tests
 * Setup takes a list of arguments like: 'default', 'tag', 'perms:tag', 'perms:init'
 * Setup does 'init' (DB) by default
 * @returns {Function}
 */
setup = function setup() {
    var self = this,
        args = arguments;

    return function (done) {
        return Models.init().then(function () {
            return initFixtures.apply(self, args);
        }).then(function () {
            done();
        }).catch(done);
    };
};

/**
 * ## DoAuth For Route Tests
 *
 * This function manages the work of ensuring we have an overridden owner user, and grabbing an access token
 * @returns {deferred.promise<AccessToken>}
 */
// TODO make this do the DB init as well
doAuth = function doAuth() {
    var options = arguments,
        request = arguments[0],
        fixtureOps;

    // Remove request from this list
    delete options[0];
    // No DB setup, but override the owner
    options = _.merge({'owner:post': true}, _.transform(options, function (result, val) {
        if (val) {
            result[val] = true;
        }
    }));

    fixtureOps = getFixtureOps(options);

    return sequence(fixtureOps).then(function () {
        return login(request);
    });
};

login = function login(request) {
    var user = DataGenerator.forModel.users[0];

    return new Promise(function (resolve, reject) {
        request.post('/ghost/api/v0.1/authentication/token/')
            .set('Origin', config.url)
            .send({
                grant_type: 'password',
                username: user.email,
                password: user.password,
                client_id: 'ghost-admin',
                client_secret: 'not_available'
            }).then(function then(res) {
                resolve(res.body.access_token);
            }, reject);
    });
};

togglePermalinks = function togglePermalinks(request, toggle) {
    var permalinkString = toggle === 'date' ? '/:year/:month/:day/:slug/' : '/:slug/';

    return new Promise(function (resolve, reject) {
        doAuth(request).then(function (token) {
            request.put('/ghost/api/v0.1/settings/')
                .set('Authorization', 'Bearer ' + token)
                .send({settings: [
                    {
                        uuid: '75e994ae-490e-45e6-9207-0eab409c1c04',
                        key: 'permalinks',
                        value: permalinkString,
                        type: 'blog',
                        created_at: '2014-10-16T17:39:16.005Z',
                        created_by: 1,
                        updated_at: '2014-10-20T19:44:18.077Z',
                        updated_by: 1
                    }
                ]})
                .end(function (err, res) {
                    if (err) {
                        return reject(err);
                    }

                    resolve(res.body);
                });
        });
    });
};

teardown = function teardown(done) {
    migration.reset().then(function () {
        done();
    }).catch(done);
};

module.exports = {
    teardown: teardown,
    setup: setup,
    doAuth: doAuth,
    login: login,
    togglePermalinks: togglePermalinks,

    initFixtures: initFixtures,
    initData: initData,
    clearData: clearData,

    fixtures: fixtures,

    DataGenerator: DataGenerator,
    API: API,

    fork: fork,

    // Helpers to make it easier to write tests which are easy to read
    context: {
        internal:   {context: {internal: true}},
        owner:      {context: {user: 1}},
        admin:      {context: {user: 2}},
        editor:     {context: {user: 3}},
        author:     {context: {user: 4}}
    },
    users: {
        ids: {
            owner: 1,
            admin: 2,
            editor: 3,
            author: 4,
            admin2: 5,
            editor2: 6,
            author2: 7
        }
    },
    roles: {
        ids: {
            owner: 4,
            admin: 1,
            editor: 2,
            author: 3
        }
    },

    cacheRules: {
        public: 'public, max-age=0',
        hour:  'public, max-age=' + 3600,
        day: 'public, max-age=' + 86400,
        year:  'public, max-age=' + 31536000,
        private: 'no-cache, private, no-store, must-revalidate, max-stale=0, post-check=0, pre-check=0'
    }
};
