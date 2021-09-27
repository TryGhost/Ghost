const settings = require('./settings');
const validation = require('./validation');

module.exports = {
    loadRedirectsFile: settings.loadRedirectsFile,
    validate: validation.validate,
    /**
     * Methods used in the API
     */
    api: {
        getRedirectsFilePath: settings.getRedirectsFilePath,
        get: settings.get,
        setFromFilePath: settings.setFromFilePath
    }
};
