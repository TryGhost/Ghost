const createFacade = require('../container/create-facade');
const createSettingsCache = require('./create');

module.exports = createFacade('settingsCache', createSettingsCache);
