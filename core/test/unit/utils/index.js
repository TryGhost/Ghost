var knex = require('../../../server/models/base').knex,
    when = require('when'),
    migration = require("../../../server/data/migration/"),
    Settings = require('../../../server/models/settings').Settings,
    DataGenerator = require('../fixtures/data-generator'),
    API = require('./api');

function initData() {
    return migration.init();
}

function clearData() {
    // we must always try to delete all tables
    return migration.reset();
}

function insertDefaultFixtures() {
    return when(insertDefaultUser().then(function(){
            return insertPosts();
        }));
}

function insertPosts() {
    return when(knex('posts').insert(DataGenerator.forKnex.posts).then(function () {
                return knex('tags').insert(DataGenerator.forKnex.tags).then(function () {
                    return knex('posts_tags').insert(DataGenerator.forKnex.posts_tags);
                });
            }));
}

function insertMorePosts() {
    var lang,
        status,
        posts,
        promises = [],
        i, j, k = 0;

    for (i = 0; i < 2; i += 1) {
        posts = [];
        lang = i % 2 ? 'en' : 'fr';
        posts.push(DataGenerator.forKnex.createGenericPost(k++, null, lang));

        for (j = 0; j < 50; j += 1) {
            status = j % 2 ? 'published' : 'draft';
            posts.push(DataGenerator.forKnex.createGenericPost(k++, status, lang));
        }

        promises.push(knex('posts').insert(posts));
    }

    return when.all(promises);
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

module.exports = {
    initData: initData,
    clearData: clearData,
    insertDefaultFixtures: insertDefaultFixtures,
    insertPosts: insertPosts,
    insertMorePosts: insertMorePosts,
    insertDefaultUser: insertDefaultUser,

    DataGenerator: DataGenerator,
    API: API
};
