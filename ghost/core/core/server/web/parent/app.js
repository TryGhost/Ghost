const debug = require('@tryghost/debug')('web:parent');
const config = require('../../../shared/config');
const express = require('../../../shared/express');
const compress = require('compression');
const mw = require('./middleware');

/**
 * @returns {import('express').Application}
 */
module.exports = function setupParentApp() {
  debug('ParentApp setup start');
  const parentApp = express('parent');

  parentApp.use(mw.requestId);
  parentApp.use(mw.logRequest);

  // Register event emitter on req/res to trigger cache invalidation webhook event
  parentApp.use(mw.emitEvents);

  // Shed load as early as the stack allows, and ahead of the queue rather than
  // behind it: a request that has already waited in the queue has paid the
  // cost shedding exists to avoid. Sits after requestId/logRequest so shed
  // responses stay traceable and show up in the access log.
  const eventLoopLagConfig = mw.parseEventLoopLagConfig(config.get('optimization:eventLoopLag'));

  if (eventLoopLagConfig.enabled) {
    parentApp.use(mw.eventLoopLag(eventLoopLagConfig));
  }

  // enabled gzip compression by default
  if (config.get('compress') !== false) {
    parentApp.use(compress());
  }

  // This sets global res.locals which are needed everywhere
  // @TODO: figure out if this is really needed everywhere? Is it not frontend only...
  parentApp.use(mw.ghostLocals);

  // Enable request queuing if configured
  const queueConfig = config.get('optimization:requestQueue');

  if (queueConfig) {
    parentApp.use(mw.queueRequest(queueConfig));
  }

  debug('ParentApp setup end');

  return parentApp;
};
