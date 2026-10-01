const errors = require('@tryghost/errors');
const logging = require('@tryghost/logging');
const config = require('../../../shared/config');
const urlUtils = require('../../../shared/url-utils').default;
const { GhostMailer } = require('../../services/mail');
const adapterManager = require('../../services/adapter-manager').default;
const ImportManager = require('./import-manager');
const RevueHandler = require('./handlers/revue');
const JSONHandler = require('./handlers/json');
const MarkdownHandler = require('./handlers/markdown');
const RevueImporter = require('./importers/importer-revue');
const DataImporter = require('./importers/data');
const { createContentFileHandlers, createContentFileImporters } = require('./content-files');

let instance;

module.exports = {
  init({ jobsService }) {
    // Every boot builds its own importer: the handlers and importers hold storage
    // adapters resolved from the configuration of the boot that built them, and an
    // in-process restart (test harness) points that configuration elsewhere.
    instance = new ImportManager({
      jobsService,
      importsStorage: adapterManager.getAdapter('storage:imports'),
      handlers: [...createContentFileHandlers(), RevueHandler, JSONHandler, MarkdownHandler],
      importers: [...createContentFileImporters(), RevueImporter, DataImporter],
      mailer: new GhostMailer(),
      config,
      urlUtils,
      logging,
    });
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
