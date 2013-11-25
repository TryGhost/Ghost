
var ghostConfig   = require('../../../config'),
    loader        = require('./loader'),
    paths         = require('./paths');


function configIndex() {
    return ghostConfig[process.env.NODE_ENV];
}


configIndex.loader = loader;
configIndex.paths = paths;


module.exports = configIndex;