const assert = require('node:assert/strict');
const sinon = require('sinon');
const config = require('../../../../../core/shared/config');
const jobQueue = require('../../../../../core/server/services/jobs/queue').default;
const {GhostMailer} = require('../../../../../core/server/services/mail');
const importManager = require('../../../../../core/server/data/importer/import-manager');

describe('ImportManager background job', function () {
    afterEach(function () {
        sinon.restore();
    });

    it('persists the upload and dispatches an ImportContentJob with a serialisable path', async function () {
        sinon.stub(config, 'get').callsFake(key => (key === 'env' ? 'production' : undefined));
        const dispatch = sinon.stub(jobQueue, 'dispatch').resolves();
        sinon.stub(importManager, 'persistUploadedFile').resolves('/data/content-import-abc.zip');
        // Validation runs in-request before the dispatch decision
        const loadFile = sinon.stub(importManager, 'loadFile').resolves({data: {}});
        sinon.stub(importManager, 'cleanUp').resolves();

        const file = {path: '/tmp/import.zip', name: 'my-import.zip'};

        await importManager.importFromFile(file, {user: {email: 'owner@example.com'}});

        sinon.assert.calledOnce(loadFile);
        sinon.assert.calledOnce(importManager.persistUploadedFile);
        sinon.assert.calledOnce(dispatch);
        const job = dispatch.firstCall.args[0];
        assert.equal(job.data.filePath, '/data/content-import-abc.zip');
        assert.equal(job.data.fileName, 'my-import.zip');
        // Payload must be serialisable — no file handle or preloaded data.
        assert.deepEqual(Object.keys(job.data).sort(), ['fileName', 'filePath', 'importOptions']);
    });

    it('does not dispatch when already running in a job', async function () {
        sinon.stub(config, 'get').callsFake(key => (key === 'env' ? 'production' : undefined));
        const dispatch = sinon.stub(jobQueue, 'dispatch').resolves();
        const persist = sinon.stub(importManager, 'persistUploadedFile').resolves('/x');
        sinon.stub(GhostMailer.prototype, 'send').resolves();
        // stop the real import from running past the dispatch decision
        sinon.stub(importManager, 'preProcess').rejects(new Error('stop'));

        const importData = {data: {}, images: []};
        await importManager.importFromFile({path: 'x'}, {data: importData, runningInJob: true, user: {email: 'o@e.com'}})
            .catch(() => {});

        sinon.assert.notCalled(dispatch);
        sinon.assert.notCalled(persist);
    });
});
