/**
 * Dependencies
 */

const _ = require('lodash');
const glob = require('glob');

// enable event listeners
require('./base/listeners');

/**
 * Expose all models
 */
exports = module.exports;

function init() {
    exports.Base = require('./base');

    let modelsFiles = glob.sync('!(index).js', {cwd: __dirname});
    modelsFiles.forEach((model) => {
        const name = model.replace(/.js$/, '');
        _.extend(exports, require('./' + name));
    });
}

/**
 * Expose `init`
 */

exports.init = init;
