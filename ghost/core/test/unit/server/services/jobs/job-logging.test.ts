import assert from 'node:assert/strict';
import sinon from 'sinon';
import logging from '@tryghost/logging';
import * as jobLogging from '../../../../../core/server/services/jobs/job-logging';

describe('Background job logging', function () {
  afterEach(function () {
    sinon.restore();
  });

  it('forwards lifecycle logs to the Ghost logger', function () {
    const info = sinon.stub(logging, 'info');
    const error = sinon.stub(logging, 'error');
    const failure = new Error('Job failed');

    jobLogging.info('[Background Job] test-job started');
    jobLogging.error(failure, '[Background Job] test-job failed');

    sinon.assert.calledOnceWithExactly(info, '[Background Job] test-job started');
    sinon.assert.calledOnceWithExactly(error, failure, '[Background Job] test-job failed');
  });

  it('does not let synchronous logger failures escape into job execution', function () {
    sinon.stub(logging, 'info').throws(new Error('Info logger unavailable'));
    sinon.stub(logging, 'error').throws(new Error('Error logger unavailable'));

    assert.doesNotThrow(() => jobLogging.info('[Background Job] test-job started'));
    assert.doesNotThrow(() =>
      jobLogging.error(new Error('Job failed'), '[Background Job] test-job failed'),
    );
  });
});
