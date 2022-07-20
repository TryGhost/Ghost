const adapterManager = require('../../services/adapter-manager');

async function createAdapter() {
    return adapterManager.getAdapter('scheduling');
}

module.exports = {
    createAdapter
};
