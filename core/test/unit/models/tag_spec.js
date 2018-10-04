const should = require('should');
const url = require('url');
const sinon = require('sinon');
const models = require('../../../server/models');
const testUtils = require('../../utils');
const {knex} = require('../../../server/data/db');

const sandbox = sinon.sandbox.create();

describe('Unit: models/tag', function () {
    const mockDb = require('mock-knex');
    let tracker;

    before(function () {
        models.init();
        mockDb.mock(knex);
        tracker = mockDb.getTracker();
    });

    after(function () {
        sandbox.restore();
    });

    after(function () {
        mockDb.unmock(knex);
    });

    before(testUtils.teardown);
    before(testUtils.setup('tags'));

    it('generates correct query for - filter: count.posts:>=1, order: count.posts DESC, limit of: all, withRelated: count.posts', function () {
        const queries = [];
        tracker.install();

        tracker.on('query', (query) => {
            queries.push(query);
            query.response([]);
        });

        return models.Tag.findPage({
            filter: 'count.posts:>=1',
            order: 'count.posts DESC',
            limit: 'all',
            withRelated: ['count.posts']
        }).then(() => {
            queries.length.should.eql(2);
            queries[0].sql.should.eql('select count(distinct tags.id) as aggregate from `tags` where `count`.`posts` >= ?');
            queries[0].bindings.should.eql([
                1
            ]);

            queries[1].sql.should.eql('select `tags`.*, (select count(`posts`.`id`) from `posts` left outer join `posts_tags` on `posts`.`id` = `posts_tags`.`post_id` where posts_tags.tag_id = tags.id) as `count__posts` from `tags` where `count`.`posts` >= ? order by `count__posts` DESC');
            queries[1].bindings.should.eql([
                1
            ]);
        });
    });

    describe('Edit', function () {
        it('resets given empty value to null', function () {
            return models.Tag.findOne({slug: 'kitchen-sink'})
                .then(function (tag) {
                    tag.get('slug').should.eql('kitchen-sink');
                    tag.get('feature_image').should.eql('https://example.com/super_photo.jpg');
                    tag.set('feature_image', '');
                    tag.set('description', '');
                    return tag.save();
                })
                .then(function (tag) {
                    should(tag.get('feature_image')).be.null();
                    tag.get('description').should.eql('');
                });
        });
    });
});
