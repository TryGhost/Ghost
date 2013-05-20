/*global require, module, process */
(function () {
    "use strict";

    var knex = require('knex');

    knex.Initialize(require('../../../config').database[process.env.NODE_ENV || 'development']);

    module.exports = knex;
}());