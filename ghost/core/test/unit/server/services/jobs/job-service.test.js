const Module = require('module');
const sinon = require('sinon');

describe('JobService', function () {
  const jobServicePath = '../../../../../core/server/services/jobs/job-service';
  const mentionsJobServicePath = '../../../../../core/server/services/mentions-jobs/job-service';
  let originalLoad;
  let workerMessageHandler;
  let workerErrorHandler;
  let info;
  let errorLog;

  beforeEach(function () {
    originalLoad = Module._load;
    info = sinon.stub();
    errorLog = sinon.stub();

    Module._load = function (request, parent, isMain) {
      if (request === '@tryghost/job-manager') {
        return class JobManager {
          constructor(options) {
            workerMessageHandler = options.workerMessageHandler;
            workerErrorHandler = options.errorHandler;
          }
        };
      }

      if (request === '@tryghost/logging') {
        return {
          info,
          warn: sinon.stub(),
          error: errorLog,
        };
      }

      if (request === '../../models') {
        return { Job: {} };
      }

      if (request === '../../../shared/sentry') {
        return { captureException: sinon.stub() };
      }

      if (request === '@tryghost/domain-events') {
        return {};
      }

      if (request === '../../../shared/config') {
        return {};
      }

      if (request === '../../lib/common/events') {
        return { emit: sinon.stub() };
      }

      return originalLoad.call(this, request, parent, isMain);
    };

    delete require.cache[require.resolve(jobServicePath)];
    require(jobServicePath);
  });

  afterEach(function () {
    Module._load = originalLoad;
    delete require.cache[require.resolve(jobServicePath)];
    delete require.cache[require.resolve(mentionsJobServicePath)];
    sinon.restore();
  });

  it('adds the common marker to worker messages', function () {
    workerMessageHandler({ name: 'clean-tokens', message: 'completed' });

    sinon.assert.calledOnceWithExactly(info, '[Background Job] clean-tokens: completed');
  });

  it('does not log worker control messages', function () {
    workerMessageHandler({ name: 'clean-tokens', message: 'done' });
    workerMessageHandler({ name: 'clean-tokens', message: 'cancelled' });

    sinon.assert.notCalled(info);
  });

  it('adds the common marker to worker failures', function () {
    const error = new Error('Job failed');

    workerErrorHandler(error, { name: 'clean-tokens' });

    sinon.assert.calledOnceWithExactly(errorLog, error, '[Background Job] clean-tokens failed');
    sinon.assert.notCalled(info);
  });
});
