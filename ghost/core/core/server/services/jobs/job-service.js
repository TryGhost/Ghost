/**
 * Minimal wrapper around our external lib
 * Intended for passing any Ghost internals such as logging and config
 */

const JobManager = require('@tryghost/job-manager');
const logging = require('@tryghost/logging');
const models = require('../../models');
const sentry = require('../../../shared/sentry');
const domainEvents = require('@tryghost/domain-events');
const config = require('../../../shared/config');
const errorHandler = (error, workerMeta) => {
  logging.error(error, `[Background Job] ${workerMeta.name} failed`);
  sentry.captureException(error);
};
const events = require('../../lib/common/events');

const workerMessageHandler = ({ name, message }) => {
  if (typeof message === 'string' && !['done', 'cancelled'].includes(message)) {
    logging.info(`[Background Job] ${name}: ${message}`);
  }
};

const jobManager = new JobManager({
  errorHandler,
  workerMessageHandler,
  JobModel: models.Job,
  domainEvents,
  config,
  events,
});

module.exports = jobManager;
