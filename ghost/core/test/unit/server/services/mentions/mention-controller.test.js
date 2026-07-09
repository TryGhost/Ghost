const assert = require('node:assert/strict');
const sinon = require('sinon');
const logging = require('@tryghost/logging');
const MentionController = require('../../../../../core/server/services/mentions/mention-controller');

// Runs the registered handler synchronously on dispatch.
function syncQueue() {
    return {
        _handler: null,
        handle(JobClass, handler) {
            this._handler = handler;
        },
        dispatch(job) {
            return this._handler(job);
        }
    };
}

describe('MentionController', function () {
    beforeEach(function () {
        sinon.stub(logging, 'info');
        sinon.stub(logging, 'error');
    });

    afterEach(function () {
        sinon.restore();
    });

    it('receive dispatches a job whose handler processes the webmention', async function () {
        const api = {processWebmention: sinon.stub().resolves()};
        const jobQueue = syncQueue();
        const controller = new MentionController();
        await controller.init({api, jobQueue, mentionResourceService: {}});
        controller.registerJobs();

        await controller.receive({data: {source: 'https://a.com/x', target: 'https://b.com/y', extra: 'z'}});

        sinon.assert.calledOnce(api.processWebmention);
        const arg = api.processWebmention.firstCall.args[0];
        assert.equal(arg.source.toString(), 'https://a.com/x');
        assert.equal(arg.target.toString(), 'https://b.com/y');
        assert.deepEqual(arg.payload, {extra: 'z'});
    });

    it('logs and swallows errors from processing', async function () {
        const api = {processWebmention: sinon.stub().rejects(new Error('boom'))};
        const jobQueue = syncQueue();
        const controller = new MentionController();
        await controller.init({api, jobQueue, mentionResourceService: {}});
        controller.registerJobs();

        await controller.receive({data: {source: 'https://a.com/x', target: 'https://b.com/y'}});

        sinon.assert.called(logging.error);
    });
});
