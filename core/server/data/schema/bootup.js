var Sephiroth = require('../sephiroth'),
    config = require('./../../config'),
    sephiroth = new Sephiroth({database: config.get('database')});

/**
 * @TODO:
 * - move this file out of schema folder
 * - key: migrations-kate
 */
module.exports = function bootUp() {
    return sephiroth.utils.isDatabaseOK();
};
