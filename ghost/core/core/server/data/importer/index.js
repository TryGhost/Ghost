const errors = require('@tryghost/errors');
const ImportManager = require('./import-manager');

let instance;

module.exports = {
  init(deps) {
    if (!instance) {
      instance = new ImportManager(deps);
    } else {
      Object.assign(instance, deps);
    }
    return instance;
  },
  get service() {
    if (!instance) {
      throw new errors.IncorrectUsageError({
        message: 'Site importer used before init(). Call init() from boot first.',
      });
    }
    return instance;
  },
};
