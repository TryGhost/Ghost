const createFacade = require('../../../shared/container/create-facade');
const RouterRegistry = require('./router-registry');

module.exports = createFacade('routingRegistry', () => new RouterRegistry());
