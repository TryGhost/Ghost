const createFacade = require('../../../shared/container/create-facade');
const createEngine = require('./create-engine');

module.exports = createFacade('hbsEngine', () => {
    const config = require('../../../shared/config');
    return createEngine({deploymentConfig: config});
});
