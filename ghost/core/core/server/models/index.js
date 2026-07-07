const createFacade = require('../../shared/container/create-facade');

// Booted processes serve the scope's model graph; bare processes fall back to
// the eagerly self-registered graph on the process bookshelf
module.exports = createFacade('models', () => require('./legacy-models'));
