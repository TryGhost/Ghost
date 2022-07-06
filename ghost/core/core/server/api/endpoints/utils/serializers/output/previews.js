const mappers = require('./mappers');
const membersService = require('../../../../../services/members');

module.exports = {
    async all(model, apiConfig, frame) {
        const tiersModels = await membersService.api.productRepository.list({
            withRelated: ['monthlyPrice', 'yearlyPrice']
        });
        const tiers = tiersModels.data ? tiersModels.data.map(tierModel => tierModel.toJSON()) : [];

        const data = await mappers.posts(model, frame, {tiers});
        frame.response = {
            previews: [data]
        };
        frame.response.previews[0].type = model.get('type');
    }
};
