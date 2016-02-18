/**
 * These fixtures are just for testing the filter spec
 */
var _    = require('lodash'),
    db   = require('../../../../server/data/db'),
    data = {};

data.tags = [
    {
        name: 'Getting Started',
        slug: 'getting-started',
        created_by: 1
    },
    {
        name: 'photo',
        slug: 'photo',
        image: 'some/image/path.jpg',
        description: 'Photo posts',
        created_by: 2
    },
    {
        name: 'Video',
        slug: 'video',
        image: 'some/image/path.jpg',
        description: 'Video posts',
        created_by: 1
    },
    {
        name: 'Audio',
        slug: 'audio',
        image: 'some/image/path.jpg',
        description: 'Audio posts',
        created_by: 1
    },
    {
        name: 'No Posts',
        slug: 'no-posts',
        created_by: 2
    },
    {
        name: 'Special',
        slug: 'special',
        created_by: 2
    }
];

// Password = Sl1m3rson
data.users = [
    {
        name: 'Leslie Jones',
        slug: 'leslie',
        email: 'ljones@nothere.com',
        password: '$2a$10$.pZeeBE0gHXd0PTnbT/ph.GEKgd0Wd3q2pWna3ynTGBkPKnGIKZL6',
        website: 'http://twitter.com/ljonestestuser'
    },
    {
        name: 'Pat Smith',
        slug: 'pat-smith',
        email: 'pat-smith@nothere.com',
        password: '$2a$10$.pZeeBE0gHXd0PTnbT/ph.GEKgd0Wd3q2pWna3ynTGBkPKnGIKZL6',
        website: 'http://github.com/patsmithtestuser'
    },
    {
        name: 'Cameron Howe',
        slug: 'camhowe',
        email: 'camhowe@c-e-is-real.com',
        password: '$2a$10$.pZeeBE0gHXd0PTnbT/ph.GEKgd0Wd3q2pWna3ynTGBkPKnGIKZL6'
    }
];

data.posts = [
    {
        title: 'First Post',
        slug: 'first-post',
        markdown: 'Hello World!',
        featured: false,
        author_id: 1,
        tags: [1]
    },
    {
        title: 'Second Post',
        slug: 'second-post',
        markdown: 'Hello World!',
        featured: false,
        author_id: 2,
        tags: [2, 3, 4, 6]
    },
    {
        title: 'Third Post',
        slug: 'third-post',
        markdown: 'Hello World!',
        featured: false,
        author_id: 1,
        tags: [2]
    },
    {
        title: 'Fourth Post',
        slug: 'fourth-post',
        markdown: 'Hello World!',
        featured: false,
        author_id: 1,
        tags: [3]
    },
    {
        title: 'Fifth Post',
        slug: 'fifth-post',
        markdown: 'Hello World!',
        featured: true,
        author_id: 2,
        tags: [6]
    },
    {
        title: 'Sixth Post',
        slug: 'sixth-post',
        markdown: 'Hello World!',
        featured: false,
        author_id: 2,
        image: 'some/image/path.jpg',
        tags: [1, 4, 6]
    },
    {
        title: 'Seventh Post',
        slug: 'seventh-post',
        markdown: 'Hello World!',
        featured: false,
        author_id: 1,
        image: 'some/image/path.jpg',
        tags: [1, 3]
    },
    {
        title: 'Eighth Post',
        slug: 'eighth-post',
        markdown: 'Hello World!',
        featured: true,
        author_id: 1,
        tags: [1, 3, 4]
    },
    {
        title: 'Ninth Post',
        slug: 'ninth-post',
        markdown: 'Hello World!',
        featured: false,
        author_id: 1,
        tags: [2, 4]
    },
    {
        title: 'Tenth Post',
        slug: 'tenth-post',
        markdown: 'Hello World!',
        featured: false,
        author_id: 1,
        tags: [3]
    },
    {
        title: 'Eleventh Post',
        slug: 'eleventh-post',
        markdown: 'Hello World!',
        featured: false,
        author_id: 1,
        image: 'some/image/path.jpg',
        tags: [2]
    },
    {
        title: 'Twelfth Post',
        slug: 'twelfth-post',
        markdown: 'Hello World!',
        featured: false,
        author_id: 1,
        tags: [4]
    },
    {
        title: 'Thirteenth Post',
        slug: 'thirteenth-post',
        markdown: 'Hello World!',
        featured: false,
        author_id: 1,
        tags: []
    },
    {
        title: 'Fourteenth Post',
        slug: 'fourteenth-post',
        markdown: 'Hello World!',
        featured: true,
        author_id: 1,
        tags: [4]
    },
    {
        title: 'Fifteenth Post',
        slug: 'fifteenth-post',
        markdown: 'Hello World! I am a featured page',
        featured: true,
        page: 1,
        author_id: 1,
        tags: []
    },
    {
        title: 'Sixteenth Post',
        slug: 'sixteenth-post',
        markdown: 'Hello World!',
        featured: false,
        author_id: 1,
        tags: []
    },
    {
        title: 'Seventeenth Post',
        slug: 'seventeenth-post',
        markdown: 'Hello World!',
        featured: false,
        author_id: 1,
        tags: []
    },
    {
        title: 'Eighteenth Post',
        slug: 'eighteenth-post',
        markdown: 'Hello World!',
        featured: false,
        author_id: 1,
        tags: []
    },
    {
        title: 'Nineteenth Post',
        slug: 'nineteenth-post',
        markdown: 'Hello World!',
        featured: false,
        status: 'draft',
        author_id: 1,
        tags: [1, 2, 3, 4]
    },
    {
        title: 'Twentieth Post',
        slug: 'twentieth-post',
        markdown: 'Hello World!',
        featured: false,
        author_id: 1,
        tags: []
    },
    {
        title: 'About Page',
        slug: 'about',
        markdown: 'About Me!',
        featured: false,
        page: 1,
        author_id: 1,
        tags: [1, 2, 3, 4]
    }
];

function fixDataIndexes(origData, storedData) {
    var indexedData = {};
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

function createTags(knex, DataGenerator, created) {
    data.tags = _.map(data.tags, function (tag) {
        tag = DataGenerator.forKnex.createBasic(tag);
        tag.created_by = created.users[tag.created_by].id;
        return tag;
    });

    // Next, insert it into the database & return the correctly indexed data
    return writeFetchFix(knex, 'tags');
}

function createPosts(knex, DataGenerator, created) {
    var postsTags = [];
    data.posts = _.map(data.posts, function (post, index) {
        post = DataGenerator.forKnex.createPost(post);
        post.created_by = created.users[post.author_id].id;
        post.author_id = created.users[post.author_id].id;
        _.each(post.tags, function (tagId) {
            postsTags.push({post_id: index + 1, tag_id: created.tags[tagId].id});
        });
        delete post.tags;
        return post;
    });

    // Next, insert it into the database & return the correctly indexed data
    return writeFetchFix(knex, 'posts').then(function (createdPosts) {
        // Handle post tags
        postsTags = _.map(postsTags, function (postTag) {
            postTag.post_id = createdPosts[postTag.post_id].id;
            return postTag;
        });

        return knex('posts_tags').insert(postsTags).then(function () {
            return createdPosts;
        });
    });
}

module.exports = function (DataGenerator) {
    var created = {};
    // Create users first
    return createUsers(db.knex, DataGenerator).then(function (createdUsers) {
        created.users = createdUsers;
        // Next create tags
        return createTags(db.knex, DataGenerator, created);
    }).then(function (createdTags) {
        created.tags = createdTags;
        // Finally, setup posts with the right authors and tags
        return createPosts(db.knex, DataGenerator, created);
    }).then(function (createdPosts) {
        created.posts = createdPosts;
        return created;
    });
};
