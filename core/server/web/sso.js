const adapterManager = require('../services/adapter-manager');

const adapter = adapterManager.getAdapter('sso');

module.exports = adapter.getSSOApp.bind(adapter);
