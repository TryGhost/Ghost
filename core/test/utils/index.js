var when          = require('when'),
    sequence      = require('when/sequence'),
    nodefn        = require('when/node'),
    _             = require('lodash'),
    fs            = require('fs-extra'),
    path          = require('path'),
    migration     = require('../../server/data/migration/'),
    settings      = require('../../server/models').Settings,
    SettingsAPI   = require('../../server/api/settings'),
    permissions   = require('../../server/permissions'),
    permsFixtures = require('../../server/data/fixtures/permissions/permissions.json'),
    DataGenerator = require('./fixtures/data-generator'),
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

    initData,
    clearData;


/** TEST FIXTURES **/
fixtures = {
    insertPosts: function insertPosts() {
        var knex = config.database.knex;
        return when(knex('posts').insert(DataGenerator.forKnex.posts)).then(function () {
            return knex('tags').insert(DataGenerator.forKnex.tags);
        }).then(function () {
            return knex('posts_tags').insert(DataGenerator.forKnex.posts_tags);
        });
    },

    insertMultiAuthorPosts: function insertMultiAuthorPosts(max) {
        var knex = config.database.knex,
            tags,
            author,
            authors,
            i, j, k = postsInserted,
            posts = [];

        max = max || 50;
        // insert users of different roles
        return when(fixtures.createUsersWithRoles()).then(function (results) {
            // create the tags
            return knex('tags').insert(DataGenerator.forKnex.tags);
        }).then(function (results) {
            return knex('users').select('id');
        }).then(function (results) {
            authors = _.pluck(results, 'id');

            // Let's insert posts with random authors
            for (i = 0; i < max; i += 1) {
                author = authors[i % authors.length];
                posts.push(DataGenerator.forKnex.createGenericPost(k++, null, null, author));
            }

            // Keep track so we can run this function again safely
            postsInserted = k;

            return sequence(_.times(posts.length, function (index) {
                return function () {
                    return knex('posts').insert(posts[index]);
                };
            }));
        }).then(function () {
            return when.all([
                // PostgreSQL can return results in any order
                knex('posts').orderBy('id', 'asc').select('id'),
                knex('tags').select('id')
            ]);
        }).then(function (results) {
            var posts = _.pluck(results[0], 'id'),
                tags = _.pluck(results[1], 'id'),
                promises = [],
                i;

            if (max > posts.length) {
                throw new Error('Trying to add more posts_tags than the number of posts.');
            }

            for (i = 0; i < max; i += 1) {
                promises.push(DataGenerator.forKnex.createPostsTags(posts[i], tags[i % tags.length]));
            }

            return sequence(_.times(promises.length, function (index) {
                return function () {
                    return knex('posts_tags').insert(promises[index]);
                };
            }));
        });
    },

    insertMorePosts: function insertMorePosts(max) {
        var lang,
            status,
            posts = [],
            i, j, k = postsInserted,
            knex = config.database.knex;

        max = max || 50;

        for (i = 0; i < 2; i += 1) {
            lang = i % 2 ? 'en' : 'fr';
            posts.push(DataGenerator.forKnex.createGenericPost(k++, null, lang));

            for (j = 0; j < max; j += 1) {
                status = j % 2 ? 'draft' : 'published';
                posts.push(DataGenerator.forKnex.createGenericPost(k++, status, lang));
            }
        }

        // Keep track so we can run this function again safely
        postsInserted = k;

        return sequence(_.times(posts.length, function (index) {
            return function () {
                return knex('posts').insert(posts[index]);
            };
        }));
    },

    insertMorePostsTags: function insertMorePostsTags(max) {
        max = max || 50;

        var knex = config.database.knex;

        return when.all([
            // PostgreSQL can return results in any order
            knex('posts').orderBy('id', 'asc').select('id'),
            knex('tags').select('id', 'name')
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
                    return knex('posts_tags').insert(promises[index]);
                };
            }));
        });
    },
    insertRoles: function insertRoles() {
        var knex = config.database.knex;
        return knex('roles').insert(DataGenerator.forKnex.roles);
    },

    initOwnerUser: function initOwnerUser() {
        var user = DataGenerator.Content.users[0],
            knex = config.database.knex;

        user = DataGenerator.forKnex.createBasic(user);
        user = _.extend({}, user, {'status': 'inactive'});

        return knex('users').insert(user);
    },

    insertOwnerUser: function insertOwnerUser() {
        var user,
            knex = config.database.knex;

        user = DataGenerator.forKnex.createUser(DataGenerator.Content.users[0]);

        return knex('users').insert(user);
    },

    overrideOwnerUser: function overrideOwnerUser() {
        var user,
            knex = config.database.knex;

        user = DataGenerator.forKnex.createUser(DataGenerator.Content.users[0]);

        return knex('users')
            .where('id', '=', '1')
            .update(user);
    },

    createUsersWithRoles: function createUsersWithRoles() {
        var knex = config.database.knex;
        return knex('roles').insert(DataGenerator.forKnex.roles).then(function () {
            return knex('users').insert(DataGenerator.forKnex.users);
        }).then(function () {
            return knex('roles_users').insert(DataGenerator.forKnex.roles_users);
        });
    },

    createExtraUsers: function createExtraUsers() {
        var knex = config.database.knex,
            // grab 3 more users
            extraUsers = DataGenerator.Content.users.slice(2, 5);

        extraUsers = _.map(extraUsers, function (user) {
            return DataGenerator.forKnex.createUser(_.extend({}, user, {
                email: 'a' + user.email,
                slug: 'a' + user.slug
            }));
        });

        return knex('users').insert(extraUsers).then(function () {
            return knex('roles_users').insert([
                    { user_id: 5, role_id: 1},
                    { user_id: 6, role_id: 2},
                    { user_id: 7, role_id: 3}
            ]);
        });
    },

    insertOne: function insertOne(obj, fn) {
        var knex = config.database.knex;
        return knex(obj)
           .insert(DataGenerator.forKnex[fn](DataGenerator.Content[obj][0]));
    },

    insertApps: function insertApps() {
        var knex = config.database.knex;
        return knex('apps').insert(DataGenerator.forKnex.apps).then(function () {
            return knex('app_fields').insert(DataGenerator.forKnex.app_fields);
        });
    },

    loadExportFixture: function loadExportFixture(filename) {
        var filepath = path.resolve(__dirname + '/fixtures/' + filename + '.json');

        return nodefn.call(fs.readFile, filepath).then(function (fileContents) {
            var data;

            // Parse the json data
            try {
                data = JSON.parse(fileContents);
            } catch (e) {
                return when.reject(new Error('Failed to parse the file'));
            }

            return data;
        });
    },

    permissionsFor: function permissionsFor(obj) {
        var knex = config.database.knex,
            permsToInsert = permsFixtures.permissions[obj],
            permsRolesToInsert = permsFixtures.permissions_roles,
            actions = [],
            permissions_roles = [],
            roles = {
                'Administrator': 1,
                'Editor': 2,
                'Author': 3,
                'Owner': 4
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
                        permissions_roles.push({permission_id: (i + 1), role_id: roles[role]});
                    });
                }
                else {
                    _.each(perms[obj], function (action) {
                        permissions_roles.push({permission_id: (_.indexOf(actions, action) + 1), role_id: roles[role]});
                    });
                }
            }
        });

        return knex('permissions').insert(permsToInsert).then(function () {
            return knex('permissions_roles').insert(permissions_roles);
        });
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
    'app': function insertApp() { return fixtures.insertOne('apps', 'createApp'); },
    'app_field': function insertAppField() {
        // TODO: use the actual app ID to create the field
        return fixtures.insertOne('apps', 'createApp').then(function () {
            return fixtures.insertOne('app_fields', 'createAppField');
        });
    },
    'app_setting': function insertAppSetting() {
        // TODO: use the actual app ID to create the field
        return fixtures.insertOne('apps', 'createApp').then(function () {
            return fixtures.insertOne('app_settings', 'createAppSetting');
        });
    },
    'permission': function insertPermission() { return fixtures.insertOne('permissions', 'createPermission'); },
    'role': function insertRole() { return fixtures.insertOne('roles', 'createRole'); },
    'roles': function insertRoles() { return fixtures.insertRoles(); },
    'tag': function insertTag() { return fixtures.insertOne('tags', 'createTag'); },

    'posts': function insertPosts() { return fixtures.insertPosts(); },
    'posts:mu': function insertMultiAuthorPosts() { return fixtures.insertMultiAuthorPosts(); },
    'apps': function insertApps() { return fixtures.insertApps(); },
    'settings': function populate() {
        return settings.populateDefaults().then(function () { return SettingsAPI.updateSettingsCache(); });
    },
    'users:roles': function createUsersWithRoles() { return fixtures.createUsersWithRoles(); },
    'users': function createExtraUsers() { return fixtures.createExtraUsers(); },
    'owner': function insertOwnerUser() { return fixtures.insertOwnerUser(); },
    'owner:pre': function initOwnerUser() { return fixtures.initOwnerUser(); },
    'owner:post': function overrideOwnerUser() { return fixtures.overrideOwnerUser(); },
    'perms:init': function initPermissions() { return permissions.init(); },
    'perms': function permissionsFor(obj) {
        return function permissionsForObj() { return fixtures.permissionsFor(obj); };
    }
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
 * @param options
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

/**
 * ## Setup Integration Tests
 * Setup takes a list of arguments like: 'default', 'tag', 'perms:tag', 'perms:init'
 * Setup does 'init' (DB) by default
 * @returns {Function}
 */
setup = function setup() {
    var options = _.merge({'init': true}, _.transform(arguments, function (result, val) {
                result[val] = true;
            })
        ),
        fixtureOps = getFixtureOps(options);

    return function (done) {
        return sequence(fixtureOps).then(function () {
            done();
        }).catch(done);
    };
};

/**
 * ## DoAuth For Route Tests
 *
 * This function manages the work of ensuring we have an overriden owner user, and grabbing an access token
 * @returns {deferred.promise<AccessToken>}
 */
// TODO make this do the DB init as well
doAuth = function doAuth() {
    var options = arguments,
        deferred = when.defer(),
        request = arguments[0],
        user = DataGenerator.forModel.users[0],
        fixtureOps;

    // Remove request from this list
    delete options[0];
    // No DB setup, but override the owner
    options = _.merge({'owner:post': true}, _.transform(options, function (result, val) {
            result[val] = true;
        })
    );

    fixtureOps = getFixtureOps(options);

    sequence(fixtureOps).then(function () {
        request.post('/ghost/api/v0.1/authentication/token/')
            .send({ grant_type: 'password', username: user.email, password: user.password, client_id: 'ghost-admin'})
            .end(function (err, res) {
                if (err) {
                    deferred.reject(err);
                }

                deferred.resolve(res.body.access_token);
            });
    });

    return deferred.promise;
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
    ONE_HOUR_S: 3600,
    ONE_YEAR_S: 31536000
};
