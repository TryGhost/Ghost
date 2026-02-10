const assert = require('node:assert/strict');
const sinon = require('sinon');
const rewire = require('rewire');

describe('process-outbox', function () {
    let processOutbox;
    let loggingStub;
    let memberWelcomeEmailServiceStub;
    let labsStub;
    let fetchPendingEntriesStub;
    let processEntriesStub;
    let originalDbModule;
    let originalOutboxModelModule;
    let originalProcessEntriesModule;
    let originalMemberWelcomeServiceModule;
    let originalLabsModule;
    let dbPath;
    let outboxModelPath;
    let processEntriesPath;
    let memberWelcomeServicePath;
    let labsPath;

    beforeEach(function () {
        dbPath = require.resolve('../../../../../../../core/server/data/db');
        outboxModelPath = require.resolve('../../../../../../../core/server/models/outbox');
        processEntriesPath = require.resolve('../../../../../../../core/server/services/outbox/jobs/lib/process-entries');
        memberWelcomeServicePath = require.resolve('../../../../../../../core/server/services/member-welcome-emails/service');
        labsPath = require.resolve('../../../../../../../core/shared/labs');

        originalDbModule = require.cache[dbPath];
        originalOutboxModelModule = require.cache[outboxModelPath];
        originalProcessEntriesModule = require.cache[processEntriesPath];
        originalMemberWelcomeServiceModule = require.cache[memberWelcomeServicePath];
        originalLabsModule = require.cache[labsPath];

        require.cache[dbPath] = {
            id: dbPath,
            filename: dbPath,
            loaded: true,
            exports: {
                knex: {
                    raw: sinon.stub().returns('CURRENT_TIMESTAMP'),
                    transaction: async (fn) => await fn(sinon.stub())
                }
            }
        };

        require.cache[outboxModelPath] = {
            id: outboxModelPath,
            filename: outboxModelPath,
            loaded: true,
            exports: {
                OUTBOX_STATUSES: {
                    PENDING: 'pending',
                    PROCESSING: 'processing'
                }
            }
        };

        require.cache[processEntriesPath] = {
            id: processEntriesPath,
            filename: processEntriesPath,
            loaded: true,
            exports: sinon.stub().resolves({processed: 0, failed: 0})
        };

        require.cache[memberWelcomeServicePath] = {
            id: memberWelcomeServicePath,
            filename: memberWelcomeServicePath,
            loaded: true,
            exports: {
                init: sinon.stub(),
                api: {
                    loadMemberWelcomeEmails: sinon.stub().resolves()
                }
            }
        };

        require.cache[labsPath] = {
            id: labsPath,
            filename: labsPath,
            loaded: true,
            exports: {
                isSet: sinon.stub().returns(true)
            }
        };

        processOutbox = rewire('../../../../../../../core/server/services/outbox/jobs/lib/process-outbox.js');

        loggingStub = {
            info: sinon.stub(),
            error: sinon.stub()
        };
        memberWelcomeEmailServiceStub = {
            init: sinon.stub(),
            api: {
                loadMemberWelcomeEmails: sinon.stub().resolves()
            }
        };
        labsStub = {
            isSet: sinon.stub().returns(true)
        };
        fetchPendingEntriesStub = sinon.stub().resolves([]);
        processEntriesStub = sinon.stub().resolves({processed: 0, failed: 0});

        processOutbox.__set__('logging', loggingStub);
        processOutbox.__set__('memberWelcomeEmailService', memberWelcomeEmailServiceStub);
        processOutbox.__set__('labs', labsStub);
        processOutbox.__set__('fetchPendingEntries', fetchPendingEntriesStub);
        processOutbox.__set__('processEntries', processEntriesStub);
    });

    afterEach(function () {
        if (originalDbModule) {
            require.cache[dbPath] = originalDbModule;
        } else {
            delete require.cache[dbPath];
        }
        if (originalOutboxModelModule) {
            require.cache[outboxModelPath] = originalOutboxModelModule;
        } else {
            delete require.cache[outboxModelPath];
        }
        if (originalProcessEntriesModule) {
            require.cache[processEntriesPath] = originalProcessEntriesModule;
        } else {
            delete require.cache[processEntriesPath];
        }
        if (originalMemberWelcomeServiceModule) {
            require.cache[memberWelcomeServicePath] = originalMemberWelcomeServiceModule;
        } else {
            delete require.cache[memberWelcomeServicePath];
        }
        if (originalLabsModule) {
            require.cache[labsPath] = originalLabsModule;
        } else {
            delete require.cache[labsPath];
        }

        sinon.restore();
    });

    it('returns structured status when welcome emails feature is disabled', async function () {
        labsStub.isSet.returns(false);

        const result = await processOutbox();

        assert.equal(result.event, 'outbox.job.feature_disabled');
        assert.equal(result.level, 'info');
    });

    it('logs and returns structured error status when initialization fails', async function () {
        memberWelcomeEmailServiceStub.api.loadMemberWelcomeEmails.rejects(new Error('init failed'));

        const result = await processOutbox();

        assert.equal(result.event, 'outbox.job.initialization_failed');
        assert.equal(result.level, 'error');
        sinon.assert.calledOnce(loggingStub.error);
        assert.equal(loggingStub.error.firstCall.args[0].event, 'outbox.job.initialization_failed');
    });

    it('returns structured no entries status when no entries are available', async function () {
        const result = await processOutbox();

        assert.equal(result.event, 'outbox.job.no_entries');
        assert.equal(result.level, 'info');
        assert.equal(result.total_processed, 0);
    });

    it('logs structured batch data and returns structured completion status', async function () {
        fetchPendingEntriesStub.onCall(0).resolves([{id: 'entry-1'}]);
        fetchPendingEntriesStub.onCall(1).resolves([]);
        processEntriesStub.resolves({processed: 1, failed: 0});

        const result = await processOutbox();

        assert.equal(result.event, 'outbox.job.completed');
        assert.equal(result.level, 'info');
        assert.equal(result.total_processed, 1);
        sinon.assert.calledOnce(loggingStub.info);
        assert.equal(loggingStub.info.firstCall.args[0].event, 'outbox.job.batch_complete');
    });
});
