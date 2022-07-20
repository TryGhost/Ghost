const should = require('should');
const url = require('url');
const sinon = require('sinon');
const models = require('../../../../core/server/models');
const testUtils = require('../../../utils');
const {knex} = require('../../../../core/server/data/db');

describe('Unit: models/tag', function () {
    before(function () {
        models.init();
    });

    afterEach(function () {
        sinon.restore();
    });

    describe('SQL', function () {
        const mockDb = require('mock-knex');
        let tracker;

        before(function () {
            mockDb.mock(knex);
            tracker = mockDb.getTracker();
        });

        after(function () {
            sinon.restore();
        });

        after(function () {
            mockDb.unmock(knex);
        });

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
                queries.length.should.eql(1);

                queries[0].sql.should.eql('select `tags`.*, (select count(`posts`.`id`) from `posts` left outer join `posts_tags` on `posts`.`id` = `posts_tags`.`post_id` where posts_tags.tag_id = tags.id) as `count__posts` from `tags` where `count`.`posts` >= ? order by `count__posts` DESC');
                queries[0].bindings.should.eql([
                    1
                ]);
            });
        });
    });
});
