const models = require('../../models');
const FrontendDataService = require('./front-end-data-service');

module.exports.init = () => {
    return new FrontendDataService({IntegrationModel: models.Integration});
};
