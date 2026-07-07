const createFacade = require('../../../shared/container/create-facade');
const {AutomationsService} = require('./service');

module.exports = createFacade('automations', () => new AutomationsService());
