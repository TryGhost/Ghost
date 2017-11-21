/*jshint expr:true*/
var Promise = require('bluebird'),
    _ = require('lodash'),
    fs = require('fs-extra'),
    path = require('path'),
    Module = require('module'),
    os = require('os'),
    debug = require('ghost-ignition').debug('test'),
    ObjectId = require('bson-objectid'),
    uuid = require('uuid'),
    KnexMigrator = require('knex-migrator'),
    ghost = require('../../server'),
    errors = require('../../server/errors'),
    db = require('../../server/data/db'),
    fixtureUtils = require('../../server/data/schema/fixtures/utils'),
    schema = require('../../server/data/schema').tables,
    schemaTables = Object.keys(schema),
    models = require('../../server/models'),
    SettingsLib = require('../../server/settings'),
    permissions = require('../../server/permissions'),
    sequence = require('../../server/utils/sequence'),
    themes = require('../../server/themes'),
    DataGenerator = require('./fixtures/data-generator'),
    configUtils = require('./configUtils'),
    filterData = require('./fixtures/filter-param'),
    API = require('./api'),
    fork = require('./fork'),
    mocks = require('./mocks'),
    config = require('../../server/config'),
    knexMigrator = new KnexMigrator(),
    fixtures,
    getFixtureOps,
    toDoList,
    originalRequireFn,
    postsInserted = 0,

    mockNotExistingModule,
    unmockNotExistingModule,
    teardown,
    setup,
    doAuth,
    createUser,
    createPost,
    login,
    togglePermalinks,
    startGhost,

    initFixtures,
    initData,
    clearData,
    clearBruteData;

// Require additional assertions which help us keep our tests small and clear
require('./assertions');

/** TEST FIXTURES **/
fixtures = {
    insertPosts: function insertPosts(posts) {
        return Promise.resolve(db.knex('posts').insert(posts));
    },

    insertPostsAndTags: function insertPostsAndTags() {
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
            authors = _.map(results, 'id');

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
                db.knex('posts').orderBy('id', 'asc').select('id'),
                db.knex('tags').select('id')
            ]);
        }).then(function (results) {
            var posts = _.map(results[0], 'id'),
                tags = _.map(results[1], 'id'),
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
            db.knex('posts').orderBy('id', 'asc').select('id'),
            db.knex('tags').select('id', 'name')
        ]).then(function (results) {
            var posts = _.map(results[0], 'id'),
                injectionTagId = _.chain(results[1])
                    .filter({name: 'injection'})
                    .map('id')
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
            .where('id', '=', DataGenerator.Content.users[0].id)
            .update(user);
    },

    changeOwnerUserStatus: function changeOwnerUserStatus(options) {
        return db.knex('users')
            .where('slug', '=', options.slug)
            .update({
                status: options.status
            });
    },

    createUsersWithRoles: function createUsersWithRoles() {
        return db.knex('roles').insert(DataGenerator.forKnex.roles).then(function () {
            return db.knex('users').insert(DataGenerator.forKnex.users);
        }).then(function () {
            return db.knex('roles_users').insert(DataGenerator.forKnex.roles_users);
        });
    },

    createUsersWithoutOwner: function createUsersWithoutOwner() {
        var usersWithoutOwner = DataGenerator.forKnex.users.slice(1);

        return db.knex('users').insert(usersWithoutOwner)
            .then(function () {
                return db.knex('roles_users').insert(DataGenerator.forKnex.roles_users);
            });
    },

    createExtraUsers: function createExtraUsers() {
        // grab 3 more users
        var extraUsers = DataGenerator.Content.users.slice(2, 5);

        extraUsers = _.map(extraUsers, function (user) {
            return DataGenerator.forKnex.createUser(_.extend({}, user, {
                id: ObjectId.generate(),
                email: 'a' + user.email,
                slug: 'a' + user.slug
            }));
        });

        // @TODO: remove when overhauling test env
        // tests need access to the extra created users (especially to the created id)
        // replacement for admin2, editor2 etc
        DataGenerator.Content.extraUsers = extraUsers;

        return db.knex('users').insert(extraUsers).then(function () {
            return db.knex('roles_users').insert([
                {id: ObjectId.generate(), user_id: extraUsers[0].id, role_id: DataGenerator.Content.roles[0].id},
                {id: ObjectId.generate(), user_id: extraUsers[1].id, role_id: DataGenerator.Content.roles[1].id},
                {id: ObjectId.generate(), user_id: extraUsers[2].id, role_id: DataGenerator.Content.roles[2].id}
            ]);
        });
    },

    insertOneUser: function insertOneUser(options) {
        options = options || {};

        return db.knex('users').insert(DataGenerator.forKnex.createUser({
            email: options.email,
            slug: options.slug,
            status: options.status
        }));
    },

    // Creates a client, and access and refresh tokens for user with index or 2 by default
    createTokensForUser: function createTokensForUser(index) {
        return db.knex('clients').insert(DataGenerator.forKnex.clients).then(function () {
            return db.knex('accesstokens').insert(DataGenerator.forKnex.createToken({
                user_id: DataGenerator.Content.users[index || 2].id
            }));
        }).then(function () {
            return db.knex('refreshtokens').insert(DataGenerator.forKnex.createToken({
                user_id: DataGenerator.Content.users[index || 2].id
            }));
        });
    },

    insertOne: function insertOne(obj, fn, index) {
        return db.knex(obj)
            .insert(DataGenerator.forKnex[fn](DataGenerator.Content[obj][index || 0]));
    },

    insertApps: function insertApps() {
        return db.knex('apps').insert(DataGenerator.forKnex.apps).then(function () {
            return db.knex('app_fields').insert(DataGenerator.forKnex.app_fields);
        });
    },

    getImportFixturePath: function (filename) {
        return path.resolve(__dirname + '/fixtures/import/' + filename);
    },

    getExportFixturePath: function (filename, options) {
        options = options || {lts: false};
        var relativePath = options.lts ? '/fixtures/export/lts/' : '/fixtures/export/';
        return path.resolve(__dirname + relativePath + filename + '.json');
    },

    loadExportFixture: function loadExportFixture(filename, options) {
        options = options || {lts: false};
        var filePath = this.getExportFixturePath(filename, options),
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
        var permsToInsert = fixtureUtils.findModelFixtures('Permission', {object_type: obj}).entries,
            permsRolesToInsert = fixtureUtils.findPermissionRelationsForObject(obj).entries,
            actions = [],
            permissionsRoles = [],
            roles = {
                Administrator: DataGenerator.Content.roles[0].id,
                Editor: DataGenerator.Content.roles[1].id,
                Author: DataGenerator.Content.roles[2].id,
                Owner: DataGenerator.Content.roles[3].id
            };

        // CASE: if empty db will throw SQLITE_MISUSE, hard to debug
        if (_.isEmpty(permsToInsert)) {
            return Promise.reject(new Error('no permission found:' + obj));
        }

        permsToInsert = _.map(permsToInsert, function (perms) {
            perms.id = ObjectId.generate();

            actions.push({type: perms.action_type, permissionId: perms.id});
            return DataGenerator.forKnex.createBasic(perms);
        });

        _.each(permsRolesToInsert, function (perms, role) {
            if (perms[obj]) {
                if (perms[obj] === 'all') {
                    _.each(actions, function (action) {
                        permissionsRoles.push({
                            id: ObjectId.generate(),
                            permission_id: action.permissionId,
                            role_id: roles[role]
                        });
                    });
                } else {
                    _.each(perms[obj], function (action) {
                        permissionsRoles.push({
                            id: ObjectId.generate(),
                            permission_id: _.find(actions, {type: action}).permissionId,
                            role_id: roles[role]
                        });
                    });
                }
            }
        });

        return db.knex('permissions').insert(permsToInsert).then(function () {
            if (_.isEmpty(permissionsRoles)) {
                return Promise.resolve();
            }

            return db.knex('permissions_roles').insert(permissionsRoles);
        });
    },

    insertClients: function insertClients() {
        return db.knex('clients').insert(DataGenerator.forKnex.clients);
    },

    insertClientWithTrustedDomain: function insertClientWithTrustedDomain() {
        var client = DataGenerator.forKnex.createClient({slug: 'ghost-test'});

        return db.knex('clients')
            .insert(client)
            .then(function () {
                return db.knex('client_trusted_domains')
                    .insert(DataGenerator.forKnex.createTrustedDomain({client_id: client.id}));
            });
    },

    insertAccessToken: function insertAccessToken(override) {
        return db.knex('accesstokens').insert(DataGenerator.forKnex.createToken(override));
    },

    insertInvites: function insertInvites() {
        return db.knex('invites').insert(DataGenerator.forKnex.invites);
    },

    insertWebhooks: function insertWebhooks() {
        return db.knex('webhooks').insert(DataGenerator.forKnex.webhooks);
    }
};

/** Test Utility Functions **/
initData = function initData() {
    return knexMigrator.init();
};

clearBruteData = function clearBruteData() {
    return db.knex('brute').truncate();
};

// we must always try to delete all tables
clearData = function clearData() {
    debug('Database reset');
    return knexMigrator.reset();
};

toDoList = {
    app: function insertApp() {
        return fixtures.insertOne('apps', 'createApp');
    },
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
    permission: function insertPermission() {
        return fixtures.insertOne('permissions', 'createPermission');
    },
    role: function insertRole() {
        return fixtures.insertOne('roles', 'createRole');
    },
    roles: function insertRoles() {
        return fixtures.insertRoles();
    },
    tag: function insertTag() {
        return fixtures.insertOne('tags', 'createTag');
    },
    subscriber: function insertSubscriber() {
        return fixtures.insertOne('subscribers', 'createSubscriber');
    },
    posts: function insertPostsAndTags() {
        return fixtures.insertPostsAndTags();
    },
    'posts:mu': function insertMultiAuthorPosts() {
        return fixtures.insertMultiAuthorPosts();
    },
    tags: function insertMoreTags() {
        return fixtures.insertMoreTags();
    },
    apps: function insertApps() {
        return fixtures.insertApps();
    },
    settings: function populateSettings() {
        return SettingsLib.init();
    },
    'users:roles': function createUsersWithRoles() {
        return fixtures.createUsersWithRoles();
    },
    'users:no-owner': function createUsersWithoutOwner() {
        return fixtures.createUsersWithoutOwner();
    },
    users: function createExtraUsers() {
        return fixtures.createExtraUsers();
    },
    'user-token': function createTokensForUser(index) {
        return fixtures.createTokensForUser(index);
    },
    owner: function insertOwnerUser() {
        return fixtures.insertOwnerUser();
    },
    'owner:pre': function initOwnerUser() {
        return fixtures.initOwnerUser();
    },
    'owner:post': function overrideOwnerUser() {
        return fixtures.overrideOwnerUser();
    },
    'perms:init': function initPermissions() {
        return permissions.init();
    },
    perms: function permissionsFor(obj) {
        return fixtures.permissionsFor(obj);
    },
    clients: function insertClients() {
        return fixtures.insertClients();
    },
    'client:trusted-domain': function insertClients() {
        return fixtures.insertClientWithTrustedDomain();
    },
    filter: function createFilterParamFixtures() {
        return filterData(DataGenerator);
    },
    invites: function insertInvites() {
        return fixtures.insertInvites();
    },
    themes: function loadThemes() {
        return themes.loadAll();
    },
    webhooks: function insertWebhooks() {
        return fixtures.insertWebhooks();
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
 * @param {Object} toDos
 */
getFixtureOps = function getFixtureOps(toDos) {
    // default = default fixtures, if it isn't present, init with tables only
    var tablesOnly = !toDos.default,
        fixtureOps = [];

    // Database initialisation
    if (toDos.init || toDos.default) {
        fixtureOps.push(function initDB() {
            // skip adding all fixtures!
            if (tablesOnly) {
                return knexMigrator.init({skip: 2});
            }

            return knexMigrator.init();
        });

        delete toDos.default;
        delete toDos.init;
    }

    // Go through our list of things to do, and add them to an array
    _.each(toDos, function (value, toDo) {
        var tmp;

        if ((toDo !== 'perms:init' && toDo.indexOf('perms:') !== -1) || toDo.indexOf('user-token:') !== -1) {
            tmp = toDo.split(':');

            fixtureOps.push(function addCustomFixture() {
                return toDoList[tmp[0]](tmp[1]);
            });
        } else {
            if (!toDoList[toDo]) {
                throw new Error('setup todo does not exist - spell mistake?');
            }

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

    return function setup(done) {
        models.init();

        if (done) {
            initFixtures.apply(self, args).then(function () {
                done();
            }).catch(done);
        } else {
            return initFixtures.apply(self, args);
        }
    };
};

// ## Functions for Route Tests (!!)

/**
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

createUser = function createUser(options) {
    var user = options.user,
        role = options.role;

    return db.knex('users').insert(user)
        .then(function () {
            return db.knex('roles');
        })
        .then(function (roles) {
            return db.knex('roles_users').insert({
                id: ObjectId.generate(),
                role_id: _.find(roles, {name: role.name}).id,
                user_id: user.id
            });
        })
        .then(function () {
            return user;
        });
};

createPost = function createPost(options) {
    var post = DataGenerator.forKnex.createPost(options.post);

    if (options.author) {
        post.author_id = options.author.id;
    }

    return db.knex('posts')
        .insert(post)
        .then(function () {
            return post;
        });
};

login = function login(request) {
    // CASE: by default we use the owner to login
    if (!request.user) {
        request.user = DataGenerator.Content.users[0];
    }

    return new Promise(function (resolve, reject) {
        request.post('/ghost/api/v0.1/authentication/token/')
            .set('Origin', config.get('url'))
            .send({
                grant_type: 'password',
                username: request.user.email,
                password: 'Sl1m3rson99',
                client_id: 'ghost-admin',
                client_secret: 'not_available'
            }).then(function then(res) {
            if (res.statusCode !== 200) {
                return reject(new errors.GhostError({
                    message: res.body.errors[0].message
                }));
            }

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
                .send({
                    settings: [
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
                    ]
                })
                .end(function (err, res) {
                    if (err) {
                        return reject(err);
                    }

                    if (res.statusCode !== 200) {
                        return reject(res.body);
                    }

                    resolve(res.body);
                });
        });
    });
};

/**
 * Has to run in a transaction for MySQL, otherwise the foreign key check does not work.
 * Sqlite3 has no truncate command.
 */
teardown = function teardown(done) {
    debug('Database teardown');
    var tables = schemaTables.concat(['migrations']);

    if (config.get('database:client') === 'sqlite3') {
        return Promise
            .mapSeries(tables, function createTable(table) {
                return db.knex.raw('DELETE FROM ' + table + ';');
            })
            .then(function () {
                done && done();
            })
            .catch(function (err) {
                // CASE: table does not exist
                if (err.errno === 1) {
                    return done && done();
                }

                done && done(err);
            });
    }

    return db.knex.transaction(function (trx) {
        return db.knex.raw('SET FOREIGN_KEY_CHECKS=0;').transacting(trx)
            .then(function () {
                return Promise
                    .each(tables, function createTable(table) {
                        return db.knex.raw('TRUNCATE ' + table + ';').transacting(trx);
                    });
            })
            .then(function () {
                return db.knex.raw('SET FOREIGN_KEY_CHECKS=1;').transacting(trx);
            })
            .then(function () {
                done && done();
            })
            .catch(function (err) {
                // CASE: table does not exist
                if (err.errno === 1146) {
                    return done && done();
                }

                return done ? done(err) : Promise.reject(err);
            });
    });
};

/**
 * offer helper functions for mocking
 * we start with a small function set to mock non existent modules
 */
originalRequireFn = Module.prototype.require;
mockNotExistingModule = function mockNotExistingModule(modulePath, module) {
    Module.prototype.require = function (path) {
        if (path.match(modulePath)) {
            return module;
        }

        return originalRequireFn.apply(this, arguments);
    };
};

unmockNotExistingModule = function unmockNotExistingModule() {
    Module.prototype.require = originalRequireFn;
};

/**
 * 1. sephiroth init db
 * 2. start ghost
 */
startGhost = function startGhost(options) {
    options = options || {redirectsFile: true};

    var contentFolderForTests = path.join(os.tmpdir(), uuid.v1(), 'ghost-test');

    /**
     * We never use the root content folder for testing!
     * We use a tmp folder.
     * @TODO: add testUtils.stopServer and ensure we remove the tmp folder.
     */
    configUtils.set('paths:contentPath', contentFolderForTests);

    fs.ensureDirSync(contentFolderForTests);
    fs.ensureDirSync(path.join(contentFolderForTests, 'data'));
    fs.ensureDirSync(path.join(contentFolderForTests, 'themes'));
    fs.ensureDirSync(path.join(contentFolderForTests, 'images'));
    fs.ensureDirSync(path.join(contentFolderForTests, 'logs'));
    fs.ensureDirSync(path.join(contentFolderForTests, 'adapters'));

    // Copy all themes into the new test content folder. Default active theme is always casper. If you want to use a different theme, you have to set the active theme (e.g. stub)
    fs.copySync(path.join(__dirname, 'fixtures', 'themes'), path.join(contentFolderForTests, 'themes'));

    if (options.redirectsFile) {
        fs.copySync(path.join(__dirname, 'fixtures', 'data', 'redirects.json'), path.join(contentFolderForTests, 'data', 'redirects.json'));
    }

    return knexMigrator.reset()
        .then(function initialiseDatabase() {
            return knexMigrator.init();
        })
        .then(function startGhost() {
            return ghost();
        });
};

module.exports = {
    startGhost: startGhost,
    teardown: teardown,
    setup: setup,
    doAuth: doAuth,
    createUser: createUser,
    createPost: createPost,
    login: login,
    togglePermalinks: togglePermalinks,

    mockNotExistingModule: mockNotExistingModule,
    unmockNotExistingModule: unmockNotExistingModule,

    /**
     * renderObject:    res.render(view, dbResponse)
     * templateOptions: hbs.updateTemplateOptions(...)
     */
    createHbsResponse: function createHbsResponse(options) {
        var renderObject = options.renderObject || {},
            templateOptions = options.templateOptions,
            locals = options.locals || {},
            hbsStructure = {
                data: {
                    blog: {},
                    config: {},
                    labs: {},
                    root: {
                        _locals: {}
                    }
                }
            };

        _.merge(hbsStructure.data, templateOptions);
        _.merge(hbsStructure.data.root, renderObject);
        _.merge(hbsStructure.data.root, locals);
        hbsStructure.data.root._locals = locals;

        return hbsStructure;
    },

    initFixtures: initFixtures,
    initData: initData,
    clearData: clearData,
    clearBruteData: clearBruteData,

    mocks: mocks,

    fixtures: fixtures,

    DataGenerator: DataGenerator,
    filterData: filterData,
    API: API,

    fork: fork,

    // Helpers to make it easier to write tests which are easy to read
    context: {
        internal: {context: {internal: true}},
        external: {context: {external: true}},
        owner: {context: {user: DataGenerator.Content.users[0].id}},
        admin: {context: {user: DataGenerator.Content.users[1].id}},
        editor: {context: {user: DataGenerator.Content.users[2].id}},
        author: {context: {user: DataGenerator.Content.users[3].id}}
    },
    users: {
        ids: {
            owner: DataGenerator.Content.users[0].id,
            admin: DataGenerator.Content.users[1].id,
            editor: DataGenerator.Content.users[2].id,
            author: DataGenerator.Content.users[3].id,
            admin2: DataGenerator.Content.users[6].id,
            editor2: DataGenerator.Content.users[4].id,
            author2: DataGenerator.Content.users[5].id
        }
    },
    roles: {
        ids: {
            owner: DataGenerator.Content.roles[3].id,
            admin: DataGenerator.Content.roles[0].id,
            editor: DataGenerator.Content.roles[1].id,
            author: DataGenerator.Content.roles[2].id
        }
    },

    cacheRules: {
        public: 'public, max-age=0',
        hour: 'public, max-age=' + 3600,
        day: 'public, max-age=' + 86400,
        year: 'public, max-age=' + 31536000,
        private: 'no-cache, private, no-store, must-revalidate, max-stale=0, post-check=0, pre-check=0'
    }
};
