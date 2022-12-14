/**
 * These fixtures are just for testing the filter spec
 */
const _ = require('lodash');

const ObjectId = require('bson-objectid').default;
const db = require('../../../../core/server/data/db');
const markdownToMobiledoc = require('../data-generator').markdownToMobiledoc;
const data = {};

// Password = Sl1m3rson
data.users = [
    {
        id: ObjectId().toHexString(),
        name: 'Leslie Jones',
        slug: 'leslie',
        email: 'ljones@nothere.com',
        password: '$2a$10$.pZeeBE0gHXd0PTnbT/ph.GEKgd0Wd3q2pWna3ynTGBkPKnGIKZL6',
        website: 'http://twitter.com/ljonestestuser'
    },
    {
        id: ObjectId().toHexString(),
        name: 'Pat Smith',
        slug: 'pat-smith',
        email: 'pat-smith@nothere.com',
        password: '$2a$10$.pZeeBE0gHXd0PTnbT/ph.GEKgd0Wd3q2pWna3ynTGBkPKnGIKZL6',
        website: 'http://github.com/patsmithtestuser'
    },
    {
        id: ObjectId().toHexString(),
        name: 'Cameron Howe',
        slug: 'camhowe',
        email: 'camhowe@c-e-is-real.com',
        password: '$2a$10$.pZeeBE0gHXd0PTnbT/ph.GEKgd0Wd3q2pWna3ynTGBkPKnGIKZL6'
    }
];

data.tags = [
    {
        id: ObjectId().toHexString(),
        name: 'Getting Started',
        slug: 'getting-started',
        created_by: data.users[0].id
    },
    {
        id: ObjectId().toHexString(),
        name: 'photo',
        slug: 'photo',
        feature_image: 'some/image/path.jpg',
        description: 'Photo posts',
        created_by: data.users[1].id
    },
    {
        id: ObjectId().toHexString(),
        name: 'Video',
        slug: 'video',
        feature_image: 'some/image/path.jpg',
        description: 'Video posts',
        created_by: data.users[0].id
    },
    {
        id: ObjectId().toHexString(),
        name: '#Audio',
        slug: 'hash-audio',
        feature_image: 'some/image/path.jpg',
        description: 'Audio posts',
        visibility: 'internal',
        created_by: data.users[0].id
    },
    {
        id: ObjectId().toHexString(),
        name: 'No Posts',
        slug: 'no-posts',
        created_by: data.users[1].id
    },
    {
        id: ObjectId().toHexString(),
        name: 'Special',
        slug: 'special',
        created_by: data.users[1].id
    }
];

data.posts = [
    {
        id: ObjectId().toHexString(),
        title: 'First Post',
        slug: 'first-post',
        mobiledoc: markdownToMobiledoc('Hello World!'),
        featured: false,
        authors: [{id: data.users[0].id}],
        tags: [data.tags[0].id]
    },
    {
        id: ObjectId().toHexString(),
        title: 'Second Post',
        slug: 'second-post',
        mobiledoc: markdownToMobiledoc('Hello World!'),
        featured: false,
        authors: [{id: data.users[1].id}],
        tags: [data.tags[1].id, data.tags[2].id, data.tags[3].id, data.tags[5].id]
    },
    {
        id: ObjectId().toHexString(),
        title: 'Third Post',
        slug: 'third-post',
        mobiledoc: markdownToMobiledoc('Hello World!'),
        featured: false,
        authors: [{id: data.users[0].id}],
        tags: [data.tags[1].id]
    },
    {
        id: ObjectId().toHexString(),
        title: 'Fourth Post',
        slug: 'fourth-post',
        mobiledoc: markdownToMobiledoc('Hello World!'),
        featured: false,
        authors: [{id: data.users[0].id}],
        tags: [data.tags[2].id]
    },
    {
        id: ObjectId().toHexString(),
        title: 'Fifth Post',
        slug: 'fifth-post',
        mobiledoc: markdownToMobiledoc('Hello World!'),
        featured: true,
        authors: [{id: data.users[1].id}],
        tags: [data.tags[5].id]
    },
    {
        id: ObjectId().toHexString(),
        title: 'Sixth Post',
        slug: 'sixth-post',
        mobiledoc: markdownToMobiledoc('Hello World!'),
        featured: false,
        authors: [{id: data.users[1].id}],
        feature_image: 'some/image/path.jpg',
        tags: [data.tags[0].id, data.tags[3].id, data.tags[5].id]
    },
    {
        id: ObjectId().toHexString(),
        title: 'Seventh Post',
        slug: 'seventh-post',
        mobiledoc: markdownToMobiledoc('Hello World!'),
        featured: false,
        authors: [{id: data.users[0].id}],
        feature_image: 'some/image/path.jpg',
        tags: [data.tags[0].id, data.tags[2].id]
    },
    {
        id: ObjectId().toHexString(),
        title: 'Eighth Post',
        slug: 'eighth-post',
        mobiledoc: markdownToMobiledoc('Hello World!'),
        featured: true,
        authors: [{id: data.users[0].id}],
        tags: [data.tags[0].id, data.tags[2].id, data.tags[3].id]
    },
    {
        id: ObjectId().toHexString(),
        title: 'Ninth Post',
        slug: 'ninth-post',
        mobiledoc: markdownToMobiledoc('Hello World!'),
        featured: false,
        authors: [{id: data.users[0].id}],
        tags: [data.tags[1].id, data.tags[3].id]
    },
    {
        id: ObjectId().toHexString(),
        title: 'Tenth Post',
        slug: 'tenth-post',
        mobiledoc: markdownToMobiledoc('Hello World!'),
        featured: false,
        authors: [{id: data.users[0].id}],
        tags: [data.tags[2].id]
    },
    {
        id: ObjectId().toHexString(),
        title: 'Eleventh Post',
        slug: 'eleventh-post',
        mobiledoc: markdownToMobiledoc('Hello World!'),
        featured: false,
        authors: [{id: data.users[0].id}],
        feature_image: 'some/image/path.jpg',
        tags: [data.tags[1].id]
    },
    {
        id: ObjectId().toHexString(),
        title: 'Twelfth Post',
        slug: 'twelfth-post',
        mobiledoc: markdownToMobiledoc('Hello World!'),
        featured: false,
        authors: [{id: data.users[0].id}],
        tags: [data.tags[3].id]
    },
    {
        id: ObjectId().toHexString(),
        title: 'Thirteenth Post',
        slug: 'thirteenth-post',
        mobiledoc: markdownToMobiledoc('Hello World!'),
        featured: false,
        authors: [{id: data.users[0].id}],
        tags: []
    },
    {
        id: ObjectId().toHexString(),
        title: 'Fourteenth Post',
        slug: 'fourteenth-post',
        mobiledoc: markdownToMobiledoc('Hello World!'),
        featured: true,
        authors: [{id: data.users[0].id}],
        tags: [data.tags[3].id]
    },
    {
        id: ObjectId().toHexString(),
        title: 'Fifteenth Post',
        slug: 'fifteenth-post',
        mobiledoc: markdownToMobiledoc('Hello World! I am a featured page'),
        featured: true,
        page: 1,
        authors: [{id: data.users[0].id}],
        tags: []
    },
    {
        id: ObjectId().toHexString(),
        title: 'Sixteenth Post',
        slug: 'sixteenth-post',
        mobiledoc: markdownToMobiledoc('Hello World!'),
        featured: false,
        authors: [{id: data.users[0].id}],
        tags: []
    },
    {
        id: ObjectId().toHexString(),
        title: 'Seventeenth Post',
        slug: 'seventeenth-post',
        mobiledoc: markdownToMobiledoc('Hello World!'),
        featured: false,
        authors: [{id: data.users[0].id}],
        tags: []
    },
    {
        id: ObjectId().toHexString(),
        title: 'Eighteenth Post',
        slug: 'eighteenth-post',
        mobiledoc: markdownToMobiledoc('Hello World!'),
        featured: false,
        authors: [{id: data.users[0].id}],
        tags: []
    },
    {
        id: ObjectId().toHexString(),
        title: 'Nineteenth Post',
        slug: 'nineteenth-post',
        mobiledoc: markdownToMobiledoc('Hello World!'),
        featured: false,
        status: 'draft',
        authors: [{id: data.users[0].id}],
        tags: [data.tags[0].id, data.tags[1].id, data.tags[2].id, data.tags[3].id]
    },
    {
        id: ObjectId().toHexString(),
        title: 'Twentieth Post',
        slug: 'twentieth-post',
        mobiledoc: markdownToMobiledoc('Hello World!'),
        featured: false,
        authors: [{id: data.users[0].id}],
        tags: []
    },
    {
        id: ObjectId().toHexString(),
        title: 'About Page',
        slug: 'about',
        mobiledoc: markdownToMobiledoc('About Me!'),
        featured: false,
        page: 1,
        authors: [{id: data.users[0].id}],
        tags: [data.tags[0].id, data.tags[1].id, data.tags[2].id, data.tags[3].id]
    }
];

function fixDataIndexes(origData, storedData) {
    const indexedData = {};
    _.each(origData, function (orig, index) {
        indexedData[index + 1] = _.find(storedData, function (stored) {
            return stored.slug === orig.slug;
        });
    });

    return indexedData;
}

function writeFetchFix(knex, resource) {
    return knex(resource).insert(data[resource]).then(function () {
        return knex(resource).select();
    }).then(function (stored) {
        return fixDataIndexes(data[resource], stored);
    });
}

function createUsers(knex, DataGenerator) {
    // First, loop through and prep the data
    data.users = _.map(data.users, function (user) {
        return DataGenerator.forKnex.createUser(user);
    });

    // Next, insert it into the database & return the correctly indexed data
    return writeFetchFix(knex, 'users');
}

function createTags(knex, DataGenerator) {
    data.tags = _.map(data.tags, function (tag) {
        return DataGenerator.forKnex.createTag(tag);
    });

    // Next, insert it into the database & return the correctly indexed data
    return writeFetchFix(knex, 'tags');
}

function createPosts(knex, DataGenerator) {
    const postsTags = [];
    const postsAuthors = [];

    data.posts = _.map(data.posts, function (post) {
        post = DataGenerator.forKnex.createPost(post);

        _.each(post.tags, function (tagId) {
            postsTags.push({
                id: ObjectId().toHexString(),
                post_id: post.id,
                tag_id: tagId
            });
        });

        delete post.tags;
        return post;
    });

    _.each(data.posts, function (post) {
        if (post.authors) {
            _.each(post.authors, function (author) {
                postsAuthors.push({
                    id: ObjectId().toHexString(),
                    post_id: post.id,
                    author_id: author.id
                });
            });
        }
    });

    // Next, insert it into the database & return the correctly indexed data
    return writeFetchFix(knex, 'posts').then(function (createdPosts) {
        return knex('posts_tags').insert(postsTags).then(function () {
            return createdPosts;
        }).then(function () {
            return knex('posts_authors').insert(postsAuthors);
        });
    });
}

module.exports = function (DataGenerator) {
    const created = {};
    // Create users first
    return createUsers(db.knex, DataGenerator).then(function () {
        // Next create tags
        return createTags(db.knex, DataGenerator);
    }).then(function () {
        // Finally, setup posts with the right authors and tags
        return createPosts(db.knex, DataGenerator);
    }).then(function (createdPosts) {
        created.posts = createdPosts;
        return created;
    });
};

module.exports.data = data;
