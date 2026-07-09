import assert from 'node:assert/strict';
import sinon from 'sinon';
import {emitMemberEditedEvents} from '../../../../../../core/server/services/members/jobs/lib/emit-member-edited-events';

describe('emitMemberEditedEvents', function () {
    let events: {emit: sinon.SinonStub};
    let logging: {warn: sinon.SinonStub; error: sinon.SinonStub};
    let sentry: {captureException: sinon.SinonStub};

    beforeEach(function () {
        events = {emit: sinon.stub()};
        logging = {warn: sinon.stub(), error: sinon.stub()};
        sentry = {captureException: sinon.stub()};
    });

    function makeModels(model: object | null) {
        return {
            Member: {
                findOne: model
                    ? sinon.stub().resolves(model)
                    : sinon.stub().rejects(Object.assign(new Error('NotFound'), {errorType: 'NotFoundError'}))
            }
        };
    }

    it('emits member.edited with previous and changed attributes on the refetched model', async function () {
        const model: any = {attributes: {id: 'm1', status: 'free'}};
        const models = makeModels(model);

        await emitMemberEditedEvents([{
            id: 'm1',
            previous: {status: 'comped'},
            changed: {status: 'free'}
        }], {models, events, logging, sentry});

        assert.equal(events.emit.callCount, 1);
        const [name, emitted, options] = events.emit.firstCall.args;
        assert.equal(name, 'member.edited');
        assert.equal(emitted, model);
        assert.equal(emitted._previousAttributes.status, 'comped');
        assert.deepEqual(emitted._changed, {status: 'free'});
        assert.deepEqual(options, {context: {internal: true}});
    });

    it('normalises *_at attributes to Dates, as a model save would emit them', async function () {
        const model: any = {attributes: {id: 'm1'}};
        const models = makeModels(model);

        await emitMemberEditedEvents([{
            id: 'm1',
            previous: {expires_at: '2026-01-01 10:00:00'},
            changed: {updated_at: '2026-02-02 11:30:00'}
        }], {models, events, logging, sentry});

        assert.ok(model._previousAttributes.expires_at instanceof Date);
        assert.ok(model._changed.updated_at instanceof Date);
    });

    it('warns and continues when a member no longer exists', async function () {
        const models = makeModels(null);

        await emitMemberEditedEvents([{
            id: 'gone',
            previous: {status: 'comped'},
            changed: {status: 'free'}
        }], {models, events, logging, sentry});

        assert.equal(events.emit.callCount, 0);
        assert.equal(logging.warn.callCount, 1);
        assert.match(logging.warn.firstCall.args[0], /gone/);
        assert.equal(sentry.captureException.callCount, 0, 'a vanished member is not an exception');
    });

    it('logs and continues when one emission fails, so the rest still emit', async function () {
        const model: any = {attributes: {id: 'm2', status: 'free'}};
        const models = {
            Member: {
                findOne: sinon.stub()
                    .onFirstCall().rejects(new Error('connection lost'))
                    .onSecondCall().resolves(model)
            }
        };

        await emitMemberEditedEvents([
            {id: 'm1', previous: {status: 'comped'}, changed: {status: 'free'}},
            {id: 'm2', previous: {status: 'comped'}, changed: {status: 'free'}}
        ], {models, events, logging, sentry});

        assert.equal(logging.error.callCount, 1);
        assert.equal(sentry.captureException.callCount, 1);
        assert.equal(events.emit.callCount, 1, 'second event still emitted');
    });
});
