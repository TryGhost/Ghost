var knex          = require('../../server/models/base').knex,
    when          = require('when'),
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
    return when(knex('posts').insert(DataGenerator.forKnex.posts).then(function () {
        return knex('tags').insert(DataGenerator.forKnex.tags).then(function () {
            return knex('posts_tags').insert(DataGenerator.forKnex.posts_tags);
        });
    }));
}

function insertMorePosts(max) {
    var lang,
        status,
        posts,
        promises = [],
        i, j, k = 0;

    max = max || 50;

    for (i = 0; i < 2; i += 1) {
        posts = [];
        lang = i % 2 ? 'en' : 'fr';
        posts.push(DataGenerator.forKnex.createGenericPost(k++, null, lang));

        for (j = 0; j < max; j += 1) {
            status = j % 2 ? 'draft' : 'published';
            posts.push(DataGenerator.forKnex.createGenericPost(k++, status, lang));
        }

        promises.push(knex('posts').insert(posts));
    }

    return when.all(promises);
}

function insertMorePostsTags(max) {
    max = max || 50;

    return when.all([
        knex('posts').select('id'),
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

        promises.push(knex('posts_tags').insert(promises));

        return when.all(promises);
    });
}

function insertDefaultUser() {
    var users = [],
        userRoles = [];

    users.push(DataGenerator.forKnex.createUser(DataGenerator.Content.users[0]));
    userRoles.push(DataGenerator.forKnex.createUserRole(1, 1));
    return when(knex('users').insert(users).then(function () {
        return knex('roles_users').insert(userRoles);
    }));
}

function insertDefaultFixtures() {
    return when(insertDefaultUser().then(function () {
        return insertPosts();
    }));
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

    loadExportFixture: loadExportFixture,

    DataGenerator: DataGenerator,
    API: API
};
