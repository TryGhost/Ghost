const errors = require('@tryghost/errors');
const createImportManager = require('./create-import-manager');

let instance;

module.exports = {
  init(overrides) {
    // Every boot builds its own importer: the handlers and importers hold storage
    // adapters resolved from the configuration of the boot that built them, and an
    // in-process restart (test harness) points that configuration elsewhere.
    instance = createImportManager(overrides);
    return instance;
  },

  getInstance() {
    if (!instance) {
      throw new errors.IncorrectUsageError({
        message: 'Site importer used before init(). Call init() from boot first.',
      });
    }
    return instance;
  },
};
