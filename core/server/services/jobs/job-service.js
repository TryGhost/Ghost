/**
 * Minimal wrapper around our external lib
 * Intended for passing any Ghost internals such as logging and config
 */

const JobManager = require('@tryghost/job-manager');
const logging = require('../../../shared/logging');

const jobManager = new JobManager(logging);

module.exports = jobManager;
