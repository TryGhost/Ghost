const assert = require('node:assert/strict');
const sinon = require('sinon');
const jobQueue = require('../../../../../core/server/services/jobs/queue').default;
const mediaInliner = require('../../../../../core/server/services/media-inliner/service');

describe('media-inliner service', function () {
    afterEach(function () {
        sinon.restore();
    });

    it('dispatches an inliner job with the provided domains', async function () {
        const dispatch = sinon.stub(jobQueue, 'dispatch').resolves();

        const result = await mediaInliner.api.startMediaInliner(['https://example.com']);

        assert.deepEqual(result, {status: 'success'});
        sinon.assert.calledOnce(dispatch);
        assert.deepEqual(dispatch.firstCall.args[0].data.domains, ['https://example.com']);
    });

    it('falls back to the default migration domains when none are given', async function () {
        const dispatch = sinon.stub(jobQueue, 'dispatch').resolves();

        await mediaInliner.api.startMediaInliner([]);

        assert.deepEqual(dispatch.firstCall.args[0].data.domains, [
            'https://s3.amazonaws.com/revue',
            'https://substackcdn.com'
        ]);
    });
});
