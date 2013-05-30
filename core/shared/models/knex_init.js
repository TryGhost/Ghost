/*global require, module, process */
(function () {
    "use strict";

    var knex = require('knex'),
        config = require('../../../config');

    knex.Initialize(config.database[process.env.NODE_ENV || 'development']);

    module.exports = knex;
}());