const urlService = require('../../core/server/services/url');

// Bounded on purpose: readiness is router registration, so a regression there
// would otherwise hang the whole run instead of failing one suite with a
// usable message.
const READY_TIMEOUT_MS = 15000;

module.exports.isFinished = async ({ timeout = READY_TIMEOUT_MS } = {}) => {
  let retryTimer;
  const start = Date.now();

  return new Promise(function (resolve, reject) {
    (function retry() {
      clearTimeout(retryTimer);

      if (urlService.hasFinished()) {
        return resolve();
      }

      if (Date.now() - start > timeout) {
        return reject(
          new Error(
            `URL service was not ready within ${timeout}ms — no router registered. ` +
              'Did boot skip dynamic routing, or did a reset run mid-boot?',
          ),
        );
      }

      retryTimer = setTimeout(retry, 50);
    })();
  });
};

module.exports.urlFor = (model, type, options) => {
  return urlService.getUrlForResource({ ...model.toJSON(), type }, options);
};

// Drop the router configs the previous boot registered. Ghost registers them
// again on the next one, so this must only run BETWEEN boots — calling it
// mid-boot (e.g. from a DB truncate) would leave the service routerless, and
// answering /404/, for the rest of that boot. There is no data-only reset to
// pair with it: the service caches nothing from the database, only the router
// configs read from routes.yaml.
module.exports.resetRouters = () => {
  urlService.reset();
};
