const models = require('../../models');
const FrontendDataService = require('./FrontendDataService');

module.exports.init = () => {
    return new FrontendDataService({IntegrationModel: models.Integration});
};
