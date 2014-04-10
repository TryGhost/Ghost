var knex          = require('../../server/models/base').knex,
    when          = require('when'),
    sequence      = require('when/sequence'),
    nodefn        = require('when/node/function'),
    _             = require('lodash'),
    fs            = require('fs-extra'),
    path          = require('path'),
    migration     = require("../../server/data/migration/"),
    Settings      = require('../../server/models/settings').Settings,
    DataGenerator = require('./fixtures/data-generator'),
    API           = require('./api');

function initData() {
    return migration.init();
}

function clearData() {
    // we must always try to delete all tables
    return migration.reset();
}

function insertPosts() {
    // ToDo: Get rid of pyramid of doom
    return when(knex('posts').insert(DataGenerator.forKnex.posts).then(function () {
        return knex('tags').insert(DataGenerator.forKnex.tags).then(function () {
            return knex('posts_tags').insert(DataGenerator.forKnex.posts_tags);
        });
    }));
}

function insertMorePosts(max) {
    var lang,
        status,
        posts = [],
        promises = [],
        i, j, k = 0;

    max = max || 50;

    for (i = 0; i < 2; i += 1) {
        lang = i % 2 ? 'en' : 'fr';
        posts.push(DataGenerator.forKnex.createGenericPost(k++, null, lang));

        for (j = 0; j < max; j += 1) {
            status = j % 2 ? 'draft' : 'published';
            posts.push(DataGenerator.forKnex.createGenericPost(k++, status, lang));
        }
    }

    return sequence(_.times(posts.length, function(index) {
        return function() {
            return knex('posts').insert(posts[index]);
        }
    }));
}

function insertMorePostsTags(max) {
    max = max || 50;

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

        return sequence(_.times(promises.length, function(index) {
            return function() {
                return knex('posts_tags').insert(promises[index]);
            };
        }));
    });
}

function insertDefaultUser() {
    var users = [],
        userRoles = [];

    users.push(DataGenerator.forKnex.createUser(DataGenerator.Content.users[0]));
    userRoles.push(DataGenerator.forKnex.createUserRole(1, 1));
    return knex('users')
        .insert(users)
        .then(function () {
            return knex('roles_users').insert(userRoles);
        });
}

function insertEditorUser() {
    var users = [],
        userRoles = [];

    users.push(DataGenerator.forKnex.createUser(DataGenerator.Content.users[1]));
    userRoles.push(DataGenerator.forKnex.createUserRole(2, 2));
    return knex('users')
        .insert(users)
        .then(function () {
            return knex('roles_users').insert(userRoles);
        });
}

function insertAuthorUser() {
    var users = [],
        userRoles = [];

    users.push(DataGenerator.forKnex.createUser(DataGenerator.Content.users[2]));
    userRoles.push(DataGenerator.forKnex.createUserRole(3, 3));
    return knex('users')
        .insert(users)
        .then(function () {
            return knex('roles_users').insert(userRoles);
        });
}

function insertDefaultApp() {
    var apps = [];

    apps.push(DataGenerator.forKnex.createApp(DataGenerator.Content.apps[0]));

    return knex('apps')
        .insert(apps)
        .then(function () {
            return knex('permissions_apps')
                .insert({
                    app_id: 1,
                    permission_id: 1
                });
        });
}

function insertApps() {
    return knex('apps').insert(DataGenerator.forKnex.apps).then(function () {
        return knex('app_fields').insert(DataGenerator.forKnex.app_fields);
    });
}

function insertAppWithSettings() {
    var apps = [], app_settings = [];

    apps.push(DataGenerator.forKnex.createApp(DataGenerator.Content.apps[0]));
    app_settings.push(DataGenerator.forKnex.createAppSetting(DataGenerator.Content.app_settings[0]));
    app_settings.push(DataGenerator.forKnex.createAppSetting(DataGenerator.Content.app_settings[1]));

    return knex('apps').insert(apps, 'id')
        .then(function (results) {
            var appId = results[0];

            for (var i = 0; i < app_settings.length; i++) {
                app_settings[i].app_id = appId;
            }

            return knex('app_settings').insert(app_settings);
        });
}
function insertAppWithFields() {
    var apps = [], app_fields = [];

    apps.push(DataGenerator.forKnex.createApp(DataGenerator.Content.apps[0]));
    app_fields.push(DataGenerator.forKnex.createAppField(DataGenerator.Content.app_fields[0]));
    app_fields.push(DataGenerator.forKnex.createAppField(DataGenerator.Content.app_fields[1]));

    return knex('apps').insert(apps, 'id')
        .then(function (results) {
            var appId = results[0];

            for (var i = 0; i < app_fields.length; i++) {
                app_fields[i].app_id = appId;
            }

            return knex('app_fields').insert(app_fields);
        });
}


function insertDefaultFixtures() {
    return insertDefaultUser().then(function () {
        return insertPosts()
    }).then(function () {
        return insertApps();
    });
}

function loadExportFixture(filename) {
    var filepath = path.resolve(__dirname + '/fixtures/' + filename + '.json');

    return nodefn.call(fs.readFile, filepath).then(function (fileContents) {
        var data;

        // Parse the json data
        try {
            data = JSON.parse(fileContents);
        } catch (e) {
            return when.reject(new Error("Failed to parse the file"));
        }

        return data;
    });
}

module.exports = {
    initData: initData,
    clearData: clearData,
    insertDefaultFixtures: insertDefaultFixtures,
    insertPosts: insertPosts,
    insertMorePosts: insertMorePosts,
    insertMorePostsTags: insertMorePostsTags,
    insertDefaultUser: insertDefaultUser,
    insertEditorUser: insertEditorUser,
    insertAuthorUser: insertAuthorUser,
    insertDefaultApp: insertDefaultApp,
    insertApps: insertApps,
    insertAppWithSettings: insertAppWithSettings,
    insertAppWithFields: insertAppWithFields,

    loadExportFixture: loadExportFixture,

    DataGenerator: DataGenerator,
    API: API
};
