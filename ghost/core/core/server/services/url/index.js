const LazyUrlService = require('./lazy-url-service');
const {createFindResource} = require('./lazy-find-resource');
const models = require('../../models');

// Singleton: every caller shares the router registrations made by
// RouterManager at boot and on every routes.yaml reload.
module.exports = new LazyUrlService({findResource: createFindResource(models)});
