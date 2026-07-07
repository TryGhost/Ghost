const {knexProxy} = require('../../data/db/knex-proxy');
const createBookshelf = require('./create-bookshelf');

// The process-wide bookshelf binds the knex proxy, so model queries follow the
// container's current connection even when models load before boot
module.exports = createBookshelf(knexProxy);
