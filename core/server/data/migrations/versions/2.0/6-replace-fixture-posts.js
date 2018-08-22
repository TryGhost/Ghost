const Promise = require('bluebird');
const _ = require('lodash');
const moment = require('moment-timezone');
const models = require('../../../../models');
const fixtures = require('../../../../data/schema/fixtures');
const common = require('../../../../lib/common');
const message1 = 'Replacing fixture posts.';
const message2 = 'Replaced fixture posts.';
const message3 = 'Rollback: Fixture posts.';

const oldFixtures = [
    {
        slug: 'welcome',
        title: 'Welcome to Ghost'
    },
    {
        slug: 'the-editor',
        title: 'Using the Ghost editor'
    },
    {
        slug: 'using-tags',
        title: 'Organising your content with tags'
    },
    {
        slug: 'managing-users',
        title: 'Managing Ghost users'
    },
    {
        slug: 'private-sites',
        title: 'Making your site private'
    },
    {
        slug: 'advanced-markdown',
        title: 'Advanced Markdown tips'
    },
    {
        slug: 'themes',
        title: 'Setting up your own Ghost theme'
    }
];

const newFixtureSlugs = _.map(_.find(fixtures.models, {name: 'Post'}).entries, 'slug');

module.exports.config = {
    transaction: true
};

// This migration scripts tries to cover one case: you have a fresh installed v1 blog and you migrate to v2.
// We try to replace the old fixture posts with the new fixture posts.
module.exports.up = (options) => {
    let localOptions = _.merge({
        context: {internal: true},
        columns: ['id', 'updated_at', 'created_at', 'published_at', 'title', 'slug'],
        withRelated: ['authors', 'tags'],
        migrating: true
    }, options);

    common.logging.info(message1);
    let oldFixturePostsCount = 0;

    // Remember a reference date of the old fixture posts
    let createdAt;
    let updatedAt;
    let publishedAt;

    return Promise.each(_.map(oldFixtures, 'slug'), (slug) => {
        // Look for published old fixture posts
        return models.Post.findOne({slug: slug}, localOptions)
            .then((model) => {
                // CASE 1: old fixture post doesn't exist
                // CASE 2: old fixture post not published, ignore
                if (!model) {
                    return;
                }

                model = model.toJSON();

                // CASE: the old fixture post is NOT owned by the ghost author, could be your own post
                if (!_.find(model.authors, {slug: 'ghost'})) {
                    return;
                }

                // CASE: could be your own post, the fixture posts only have 1 primary author by default
                if (model.authors.length === 2) {
                    return;
                }

                // CASE: the old fixture post is NOT tagged with getting started, could be your own post
                if (!_.find(model.tags, {slug: 'getting-started'})) {
                    return;
                }

                // CASE: could be your own post, the fixture posts only have 1 primary tag by default
                if (model.tags.length === 2) {
                    return;
                }

                // CASE: title equals old fixture post, ensure it's not your own post
                if (model.title !== _.find(oldFixtures, {slug: model.slug}).title) {
                    return;
                }

                oldFixturePostsCount = oldFixturePostsCount + 1;

                // remember date ref
                createdAt = model.created_at;
                updatedAt = model.updated_at;
                publishedAt = model.published_at;

                // destroy the old published fixture post
                return models.Post.destroy(Object.assign({id: model.id}, localOptions));
            });
    }).then(() => {
        // CASE: We only insert the new post fixtures if you had all old fixture posts in the database and they were published
        // Otherwise we have no clue in which state your blog is in.
        if (oldFixturePostsCount !== 7) {
            return;
        }

        const newPostFixtures = _.cloneDeep(fixtures.utils.findModelFixtures('Post'));
        const newPostRelationFixtures = fixtures.utils.findRelationFixture('Post', 'Tag');

        // Add all the new post fixtures with the old and correct reference date
        _.forEach(newPostFixtures.entries, function (post, index) {
            post.created_at = createdAt;
            post.updated_at = updatedAt;
            post.published_at = moment(publishedAt).add(index, 'seconds').toDate();
        });

        return fixtures.utils.addFixturesForModel(newPostFixtures, _.omit(localOptions, ['withRelated', 'columns']))
            .then(() => {
                return fixtures.utils.addFixturesForRelation(newPostRelationFixtures, _.omit(localOptions, ['withRelated', 'columns']));
            });
    }).then(() => {
        common.logging.info(message2);
    });
};

module.exports.down = (options) => {
    let localOptions = _.merge({
        context: {internal: true},
        columns: ['id', 'title', 'slug'],
        withRelated: ['authors', 'tags'],
        migrating: true
    }, options);

    common.logging.info(message3);

    return Promise.each(newFixtureSlugs, (slug) => {
        return models.Post.findOne({slug: slug, status: 'all'}, localOptions)
            .then((model) => {
                // CASE: new fixture post doesn't exist
                if (!model) {
                    return;
                }

                model = model.toJSON();

                // CASE: the old fixture post is NOT owned by the ghost author, could be your own post
                if (!_.find(model.authors, {slug: 'ghost'})) {
                    return;
                }

                // CASE: could be your own post, the fixture posts only have 1 primary author by default
                if (model.authors.length === 2) {
                    return;
                }

                // CASE: the old fixture post is NOT tagged with getting started
                if (!_.find(model.tags, {slug: 'getting-started'})) {
                    return;
                }

                // CASE: could be your own post, the fixture posts only have 1 primary tag by default
                if (model.tags.length === 2) {
                    return;
                }

                // CASE: ensure it's not your own post
                if (model.title !== _.find(_.find(fixtures.models, {name: 'Post'}).entries, {slug: model.slug}).title) {
                    return;
                }

                return models.Post.destroy(Object.assign({id: model.id}, localOptions));
            });
    });
};
