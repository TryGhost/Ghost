const db = require('../../data/db');
const createBookshelf = require('./create-bookshelf');

// The process-wide bookshelf instance; model files register on this at require
// time until the models factory migration completes
module.exports = createBookshelf(db.knex);
