const Promise = require('bluebird');
const _ = require('lodash');
const models = require('../../../../models');
const fixtures = require('../../../../data/schema/fixtures');
const common = require('../../../../lib/common');
const message1 = 'Replacing fixture posts.';
const message2 = 'Replaced fixture posts.';
const message3 = 'Rollback: Fixture posts.';

const oldFixtureSlugs = ['welcome', 'the-editor', 'using-tags', 'managing-users', 'private-sites', 'advanced-markdown', 'themes'];
const newFixtureSlugs = _.map(_.find(fixtures.models, {name: 'Post'}).entries, 'slug');

module.exports.config = {
    transaction: true
};

module.exports.up = (options) => {
    let localOptions = _.merge({
        context: {internal: true},
        columns: ['id'],
        withRelated: ['authors', 'tags'],
        migrating: true
    }, options);

    common.logging.info(message1);
    let oldFixturePostsCount = 0;

    return Promise.each(oldFixtureSlugs, (slug) => {
        return models.Post.findOne({slug: slug, status: 'all'}, localOptions)
            .then((model) => {
                // CASE: fixture post doesn't exist
                if (!model) {
                    return;
                }

                model = model.toJSON();

                // CASE: the old fixture post is NOT owned by the ghost author, could be your own post
                if (!_.find(model.authors, {slug: 'ghost'})) {
                    return;
                }

                // CASE: the old fixture post is NOT tagged with getting started
                if (!_.find(model.tags, {slug: 'getting-started'})) {
                    return;
                }

                oldFixturePostsCount = oldFixturePostsCount + 1;
                return models.Post.destroy(Object.assign({id: model.id}, localOptions));
            });
    }).then(() => {
        // We only insert the new post fixtures if you had ALL old fixure posts in the database
        if (oldFixturePostsCount !== 7) {
            return;
        }

        const newPostFixtures = fixtures.utils.findModelFixtures('Post');
        const newPostRelationFixtures = fixtures.utils.findRelationFixture('Post', 'Tag');

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
        columns: ['id'],
        withRelated: ['authors', 'tags'],
        migrating: true
    }, options);

    common.logging.info(message3);

    return Promise.each(newFixtureSlugs, (slug) => {
        return models.Post.findOne({slug: slug, status: 'all'}, localOptions)
            .then((model) => {
                // CASE: fixture post doesn't exist
                if (!model) {
                    return;
                }

                model = model.toJSON();

                // CASE: the old fixture post is NOT owned by the ghost author, could be your own post
                if (!_.find(model.authors, {slug: 'ghost'})) {
                    return;
                }

                // CASE: the old fixture post is NOT tagged with getting started
                if (!_.find(model.tags, {slug: 'getting-started'})) {
                    return;
                }

                return models.Post.destroy(Object.assign({id: model.id}, localOptions));
            });
    });
};
