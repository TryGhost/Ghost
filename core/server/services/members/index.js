const config = require('../../config/index.js');

module.exports = {
    get api() {
        if (!config.get('enableDeveloperExperiments')) {
            return {};
        }
        return require('./api');
    }
};
