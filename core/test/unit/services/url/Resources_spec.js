
const should = require('should');
const _ = require('lodash');
const sinon = require('sinon');
const testUtils = require('../../../utils');
const models = require('../../../../server/models');
const common = require('../../../../server/lib/common');
const Resources = require('../../../../server/services/url/Resources');
const sandbox = sinon.sandbox.create();

describe('Unit: services/url/Resources', function () {
    let onEvents, emitEvents, resources, queue;

    before(function () {
        models.init();
    });

    before(testUtils.teardown);
    before(testUtils.setup('users:roles', 'posts'));

    beforeEach(function () {
        onEvents = {};
        emitEvents = {};

        sandbox.stub(common.events, 'on').callsFake(function (eventName, callback) {
            onEvents[eventName] = callback;
        });

        sandbox.stub(common.events, 'emit').callsFake(function (eventName, data) {
            emitEvents[eventName] = data;
        });

        queue = {
            start: sandbox.stub()
        };
    });

    afterEach(function () {
        sandbox.restore();
        resources.reset();
    });

    it('db.ready', function (done) {
        resources = new Resources(queue);

        queue.start.callsFake(function (options) {
            options.event.should.eql('init');

            const created = resources.getAll();

            created.posts.length.should.eql(4);

            should.exist(created.posts[0].data.primary_author);
            should.exist(created.posts[0].data.primary_tag);

            should.exist(created.posts[1].data.primary_author);
            should.exist(created.posts[1].data.primary_tag);

            should.exist(created.posts[2].data.primary_author);
            should.exist(created.posts[2].data.primary_tag);

            should.exist(created.posts[3].data.primary_author);
            should.not.exist(created.posts[3].data.primary_tag);

            created.pages.length.should.eql(1);

            // all mocked tags are public
            created.tags.length.should.eql(testUtils.DataGenerator.forKnex.tags.length);

            // all mocked users are active
            created.users.length.should.eql(testUtils.DataGenerator.forKnex.users.length);
            done();
        });

        onEvents['db.ready']();
    });

    it('add resource', function (done) {
        resources = new Resources(queue);

        queue.start.callsFake(function (options) {
            options.event.should.eql('init');

            queue.start.callsFake(function (options) {
                options.event.should.eql('added');
                const obj = _.find(resources.data.posts, {data: {slug: 'test-1234'}}).data;

                Object.keys(obj).sort().should.eql([
                    'id',
                    'uuid',
                    'slug',
                    'comment_id',
                    'featured',
                    'page',
                    'status',
                    'visibility',
                    'created_at',
                    'updated_at',
                    'published_at',
                    'published_by',
                    'created_by',
                    'updated_by',
                    'tags',
                    'authors',
                    'author',
                    'primary_author',
                    'primary_tag',
                    'url'
                ].sort());

                should.exist(resources.getByIdAndType(options.eventData.type, options.eventData.id));
                obj.tags.length.should.eql(1);
                Object.keys(obj.tags[0]).sort().should.eql(['id', 'slug'].sort());
                obj.authors.length.should.eql(1);
                Object.keys(obj.authors[0]).sort().should.eql(['id', 'slug'].sort());
                should.exist(obj.primary_author);
                Object.keys(obj.primary_author).sort().should.eql(['id', 'slug'].sort());
                should.exist(obj.primary_tag);
                Object.keys(obj.primary_tag).sort().should.eql(['id', 'slug'].sort());
                done();
            });

            models.Post.add({
                slug: 'test-1234',
                status: 'published',
                tags: [{slug: 'tag-1', name: 'tag-name'}]
            }, testUtils.context.owner)
                .then(function () {
                    onEvents['post.published'](emitEvents['post.published']);
                })
                .catch(done);
        });

        onEvents['db.ready']();
    });

    it('update taken resource', function (done) {
        resources = new Resources(queue);

        queue.start.callsFake(function (options) {
            options.event.should.eql('init');

            const randomResource = resources.getAll().posts[Math.floor(Math.random() * (resources.getAll().posts.length - 0) + 0)];
            randomResource.reserve();

            randomResource.addListener('updated', function () {
                randomResource.data.slug.should.eql('tada');
                done();
            });

            models.Post.edit({
                slug: 'tada'
            }, _.merge({id: randomResource.data.id}, testUtils.context.owner))
                .then(function () {
                    onEvents['post.published.edited'](emitEvents['post.published.edited']);
                })
                .catch(done);
        });

        onEvents['db.ready']();
    });

    it('update free resource', function (done) {
        resources = new Resources(queue);

        queue.start.callsFake(function (options) {
            options.event.should.eql('init');

            const resourceToUpdate = _.find(resources.getAll().posts, (resource) => {
                if (resource.data.tags.length && resource.data.authors.length) {
                    return true;
                }

                return false;
            });

            sandbox.spy(resourceToUpdate, 'update');

            queue.start.callsFake(function (options) {
                options.event.should.eql('added');

                resourceToUpdate.update.calledOnce.should.be.true();
                resourceToUpdate.data.slug.should.eql('eins-zwei');

                const obj = _.find(resources.data.posts, {data: {id: resourceToUpdate.data.id}}).data;

                Object.keys(obj).sort().should.eql([
                    'id',
                    'uuid',
                    'slug',
                    'comment_id',
                    'featured',
                    'page',
                    'status',
                    'visibility',
                    'created_at',
                    'created_by',
                    'updated_at',
                    'updated_by',
                    'published_at',
                    'published_by',
                    'tags',
                    'authors',
                    'author',
                    'primary_author',
                    'primary_tag',
                    'url'
                ].sort());

                should.exist(obj.tags);
                Object.keys(obj.tags[0]).sort().should.eql(['id', 'slug'].sort());
                should.exist(obj.authors);
                Object.keys(obj.authors[0]).sort().should.eql(['id', 'slug'].sort());
                should.exist(obj.primary_author);
                Object.keys(obj.primary_author).sort().should.eql(['id', 'slug'].sort());
                should.exist(obj.primary_tag);
                Object.keys(obj.primary_tag).sort().should.eql(['id', 'slug'].sort());

                done();
            });

            models.Post.edit({
                slug: 'eins-zwei'
            }, _.merge({id: resourceToUpdate.data.id}, testUtils.context.owner))
                .then(function () {
                    onEvents['post.published.edited'](emitEvents['post.published.edited']);
                })
                .catch(done);
        });

        onEvents['db.ready']();
    });

    it('remove resource', function (done) {
        resources = new Resources(queue);

        queue.start.callsFake(function (options) {
            options.event.should.eql('init');

            const randomResource = resources.getAll().posts[Math.floor(Math.random() * (resources.getAll().posts.length - 0) + 0)];
            randomResource.reserve();

            randomResource.addListener('removed', function () {
                should.not.exist(resources.getByIdAndType('posts', randomResource.data.id));
                done();
            });

            models.Post.destroy(_.merge({id: randomResource.data.id}, testUtils.context.owner))
                .then(function () {
                    onEvents['post.unpublished'](emitEvents['post.unpublished']);
                })
                .catch(done);
        });

        onEvents['db.ready']();
    });
});
