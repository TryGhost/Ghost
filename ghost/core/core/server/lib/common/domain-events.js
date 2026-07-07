const createFacade = require('../../../shared/container/create-facade');
const createDomainEvents = require('./create-domain-events');

module.exports = createFacade('domainEvents', createDomainEvents);
