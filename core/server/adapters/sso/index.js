const adapterManager = require('../../services/adapter-manager');

function getSSO() {
    return adapterManager.getAdapter('sso');
}

module.exports.getSSO = getSSO;
