/**
 * Dependencies
 */

const _ = require('lodash');
const glob = require('glob');

/**
 * Expose all models
 */
exports = module.exports;

function init() {
    // enable event listeners
    require('./base/listeners');

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
