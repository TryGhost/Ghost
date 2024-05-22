/**
 * Dependencies
 */

const _ = require('lodash');
const debug = require('@tryghost/debug')('models');
const glob = require('glob');

// enable event listeners
require('./base/listeners');

/**
 * Expose all models
 */
exports = module.exports;

function init() {
    const baseNow = Date.now();
    exports.Base = require('./base');
    debug(`${Date.now() - baseNow}ms - Base.js require`);

    let modelsFiles = glob.sync('!(index).js', {cwd: __dirname});
    modelsFiles.forEach((model) => {
        const name = model.replace(/.js$/, '');
        const modelNow = Date.now();
        _.extend(exports, require('./' + name));
        debug(`${Date.now() - modelNow}ms - ${model} require`);
    });
}

/**
 * Expose `init`
 */

exports.init = init;
