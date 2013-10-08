var knex = require('../../server/models/base').Knex,
    when = require('when'),
    migration = require("../../server/data/migration/"),
    Settings = require('../../server/models/settings').Settings,
    DataGenerator = require('./fixtures/data-generator'),
    API = require('./utils/api');

function initData() {
    return migration.init();
}

function clearData() {
    // we must always try to delete all tables
    return migration.reset();
}

function insertDefaultFixtures() {
    var promises = [];

    promises.push(insertDefaultUser());
    promises.push(insertPosts());

    return when.all(promises);
}

function insertPosts() {
    var promises = [];

    promises.push(knex('posts').insert(DataGenerator.forKnex.posts));
    promises.push(knex('tags').insert(DataGenerator.forKnex.tags));
    promises.push(knex('posts_tags').insert(DataGenerator.forKnex.posts_tags));

    return when.all(promises);
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
        userRoles = [],
        u_promises = [];

    users.push(DataGenerator.forKnex.createUser(DataGenerator.Content.users[0]));
    u_promises.push(knex('users').insert(users));
    userRoles.push(DataGenerator.forKnex.createUserRole(1, 1));
    u_promises.push(knex('roles_users').insert(userRoles));

    return when.all(u_promises);
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
