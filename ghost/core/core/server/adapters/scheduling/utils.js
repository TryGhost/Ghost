const adapterManager = require('../../services/adapter-manager');

function createAdapter() {
    return adapterManager.getAdapter('scheduling');
}

module.exports = {
    createAdapter
};
