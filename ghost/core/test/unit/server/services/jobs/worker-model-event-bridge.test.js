const assert = require('node:assert/strict');
const sinon = require('sinon');

const WorkerModelEventBridge = require('../../../../../core/server/services/jobs/worker-model-event-bridge');

describe('WorkerModelEventBridge', function () {
    let models;
    let events;
    let logging;
    let sentry;
    let bridge;

    beforeEach(function () {
        models = {
            Member: {
                findOne: sinon.stub()
            }
        };
        events = {
            emit: sinon.stub()
        };
        logging = {
            warn: sinon.stub(),
            error: sinon.stub()
        };
        sentry = {
            captureException: sinon.stub()
        };
        bridge = new WorkerModelEventBridge({models, events, logging, sentry});
    });

    it('emits a reconstructed member.edited event', async function () {
        const currentUpdatedAt = new Date('2026-05-29T00:00:00.000Z');
        const model = {
            attributes: {
                id: 'member-id',
                email: 'member@example.com',
                status: 'free',
                updated_at: currentUpdatedAt
            }
        };

        models.Member.findOne.resolves(model);

        const result = await bridge.handle({
            type: 'model-event',
            eventName: 'member.edited',
            model: 'Member',
            id: 'member-id',
            previous: {
                status: 'comped',
                updated_at: '2026-04-28T15:55:45.000Z'
            },
            changed: {
                status: 'free',
                updated_at: currentUpdatedAt
            },
            options: {
                context: {internal: true}
            }
        }, {
            jobName: 'clean-expired-comped'
        });

        assert.equal(result, true);
        sinon.assert.calledOnceWithExactly(models.Member.findOne, {
            id: 'member-id'
        }, {
            require: true,
            context: {internal: true}
        });

        assert.equal(model._previousAttributes.id, 'member-id');
        assert.equal(model._previousAttributes.email, 'member@example.com');
        assert.equal(model._previousAttributes.status, 'comped');
        assert.deepEqual(model._previousAttributes.updated_at, new Date('2026-04-28T15:55:45.000Z'));
        assert.equal(model._changed.status, 'free');
        assert.deepEqual(model._changed.updated_at, currentUpdatedAt);
        sinon.assert.calledOnceWithExactly(events.emit, 'member.edited', model, {
            context: {internal: true}
        });
        sinon.assert.notCalled(logging.warn);
        sinon.assert.notCalled(logging.error);
        sinon.assert.notCalled(sentry.captureException);
    });

    it('logs and ignores unsupported model events', async function () {
        const result = await bridge.handle({
            type: 'model-event',
            eventName: 'post.edited',
            model: 'Post',
            id: 'post-id',
            previous: {title: 'Old title'},
            changed: {title: 'New title'}
        }, {
            jobName: 'some-job'
        });

        assert.equal(result, false);
        sinon.assert.calledOnce(logging.warn);
        sinon.assert.notCalled(models.Member.findOne);
        sinon.assert.notCalled(events.emit);
        sinon.assert.notCalled(logging.error);
        sinon.assert.notCalled(sentry.captureException);
    });

    it('rejects a supported event paired with the wrong model', async function () {
        const result = await bridge.handle({
            type: 'model-event',
            eventName: 'member.edited',
            model: 'Post',
            id: 'member-id',
            previous: {status: 'comped'},
            changed: {status: 'free'}
        }, {
            jobName: 'clean-expired-comped'
        });

        assert.equal(result, false);
        sinon.assert.calledOnce(logging.warn);
        sinon.assert.notCalled(models.Member.findOne);
        sinon.assert.notCalled(events.emit);
    });

    it('logs and ignores malformed model event messages', async function () {
        const result = await bridge.handle({
            type: 'model-event',
            eventName: 'member.edited',
            model: 'Member',
            id: 'member-id',
            previous: {status: 'comped'},
            changed: {}
        }, {
            jobName: 'clean-expired-comped'
        });

        assert.equal(result, false);
        sinon.assert.calledOnce(logging.warn);
        sinon.assert.notCalled(models.Member.findOne);
        sinon.assert.notCalled(events.emit);
    });

    it('logs missing models without crashing', async function () {
        const notFoundError = new Error('EmptyResponse');
        models.Member.findOne.rejects(notFoundError);

        const result = await bridge.handle({
            type: 'model-event',
            eventName: 'member.edited',
            model: 'Member',
            id: 'missing-member-id',
            previous: {status: 'comped'},
            changed: {status: 'free'}
        }, {
            jobName: 'clean-expired-comped'
        });

        assert.equal(result, false);
        sinon.assert.calledOnce(logging.warn);
        sinon.assert.notCalled(events.emit);
        sinon.assert.notCalled(logging.error);
        sinon.assert.notCalled(sentry.captureException);
    });

    it('captures handler errors without crashing', async function () {
        const error = new Error('database unavailable');
        models.Member.findOne.rejects(error);

        const result = await bridge.handle({
            type: 'model-event',
            eventName: 'member.edited',
            model: 'Member',
            id: 'member-id',
            previous: {status: 'comped'},
            changed: {status: 'free'}
        }, {
            jobName: 'clean-expired-comped'
        });

        assert.equal(result, false);
        sinon.assert.calledOnceWithExactly(logging.error, error);
        sinon.assert.calledOnceWithExactly(sentry.captureException, error);
        sinon.assert.notCalled(events.emit);
    });
});
