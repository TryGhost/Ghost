const logging = require('@tryghost/logging');
const config = require('../../../shared/config');
const urlUtils = require('../../../shared/url-utils').default;
const { GhostMailer } = require('../../services/mail');
const jobManager = require('../../services/jobs');
const ImportManager = require('./import-manager');
const RevueHandler = require('./handlers/revue');
const JSONHandler = require('./handlers/json');
const MarkdownHandler = require('./handlers/markdown');
const RevueImporter = require('./importers/importer-revue');
const DataImporter = require('./importers/data');
const { createContentFileHandlers, createContentFileImporters } = require('./content-files');

module.exports = new ImportManager({
  jobManager,
  handlers: [...createContentFileHandlers(), RevueHandler, JSONHandler, MarkdownHandler],
  importers: [...createContentFileImporters(), RevueImporter, DataImporter],
  mailer: new GhostMailer(),
  config,
  urlUtils,
  logging,
});
