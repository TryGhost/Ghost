const ImportManager = require('../../../../../core/server/data/importer/import-manager');
const {
  createContentFileHandlers,
  createContentFileImporters,
} = require('../../../../../core/server/data/importer/content-files');

export function dependencies() {
  return {
    jobsService: {},
    handlers: [
      ...createContentFileHandlers(),
      require('../../../../../core/server/data/importer/handlers/revue'),
      require('../../../../../core/server/data/importer/handlers/json'),
      require('../../../../../core/server/data/importer/handlers/markdown'),
    ],
    importers: [
      ...createContentFileImporters(),
      require('../../../../../core/server/data/importer/importers/importer-revue'),
      require('../../../../../core/server/data/importer/importers/data'),
    ],
    mailer: new (require('../../../../../core/server/services/mail').GhostMailer)(),
    config: require('../../../../../core/shared/config'),
    urlUtils: require('../../../../../core/shared/url-utils').default,
    logging: require('@tryghost/logging'),
  };
}

export default function createImportManager() {
  return new ImportManager(dependencies());
}
