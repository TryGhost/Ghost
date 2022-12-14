const models = require('../../models');
const FrontendDataService = require('./frontend-data-service');

module.exports.init = () => {
    return new FrontendDataService({IntegrationModel: models.Integration});
};
