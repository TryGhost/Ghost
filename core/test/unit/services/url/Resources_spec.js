
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
                should.exist(resources.getByIdAndType(options.eventData.type, options.eventData.id));
                done();
            });

            models.Post.add({
                title: 'test',
                status: 'published'
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
                randomResource.data.title.should.eql('new title, wow');
                done();
            });

            models.Post.edit({
                title: 'new title, wow'
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

            const randomResource = resources.getAll().posts[Math.floor(Math.random() * (resources.getAll().posts.length - 0) + 0)];

            randomResource.update = sandbox.stub();

            queue.start.callsFake(function (options) {
                options.event.should.eql('added');
                randomResource.update.calledOnce.should.be.true();
                done();
            });

            models.Post.edit({
                title: 'new title, wow'
            }, _.merge({id: randomResource.data.id}, testUtils.context.owner))
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
